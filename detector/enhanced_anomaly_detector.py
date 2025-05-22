"""Enhanced Anomaly Detector Module
Contributors:
Kenil Gopani: Implemented the enhanced anomaly detection logic with user profiling and adaptive thresholds. Optimized model performance, managed containerized deployment infrastructure, and handled scalability testing under high-load scenarios.
Kruti Bathani: Developed the core anomaly detector services and Kafka-based streaming pipeline.
"""

from kafka import KafkaConsumer
from pyod.models.iforest import IForest
import pandas as pd
import psycopg2
import json
import time
import os
import sys
import subprocess

# Fix import path for components
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from components.user_profile_manager import UserProfileManager

# First, check if the database schema is correct
def check_database_schema():
    """Check and initialize the database schema if needed"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    run_detector_script = os.path.join(base_dir, "scripts", "run_detector.py")
    
    if not os.path.exists(run_detector_script):
        print(f"Warning: Could not find run_detector.py at {run_detector_script}")
        print("Continuing without schema validation...")
        return
    
    print("Checking database schema...")
    result = subprocess.run(
        [sys.executable, run_detector_script, "--check-only"], 
        capture_output=True, 
        text=True
    )
    
    if result.returncode != 0:
        print("Database schema validation failed:")
        print(result.stderr)
        print(result.stdout)
        print("Exiting...")
        sys.exit(1)
    
    # Initialize history table
    create_history_script = os.path.join(base_dir, "scripts", "create_history_table.py")
    if os.path.exists(create_history_script):
        print("Setting up transaction history tables...")
        result = subprocess.run(
            [sys.executable, create_history_script],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("Warning: Failed to set up history tables")
            print(result.stderr)
            print(result.stdout)
    
    print("Database schema verified successfully")

# Run schema check at startup
check_database_schema()

# Initialize user profile manager
user_manager = UserProfileManager()
print("Initialized user profile manager")

# Kafka consumer configuration
consumer = KafkaConsumer(
    'transactions',
    bootstrap_servers='localhost:9092',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    group_id='anomaly-detector-group'
)

# Connect to PostgreSQL with improved connection settings
conn = psycopg2.connect(
    dbname="anomalies",
    user="user",
    password="pass",
    host="localhost",
    port="5432",
    connect_timeout=10
)
conn.set_session(autocommit=False)  # Explicit transaction control
cursor = conn.cursor()

# Function to reconnect to database if connection is lost
def reconnect_db():
    global conn, cursor
    try:
        if conn.closed:
            conn = psycopg2.connect(
                dbname="anomalies",
                user="user",
                password="pass",
                host="localhost",
                port="5432",
                connect_timeout=10
            )
            conn.set_session(autocommit=False)
            cursor = conn.cursor()
        else:
            # Test if connection is still active
            cursor.execute("SELECT 1")
    except Exception as e:
        print(f"Reconnecting to database: {e}")
        try:
            if not conn.closed:
                conn.close()
            conn = psycopg2.connect(
                dbname="anomalies",
                user="user", 
                password="pass",
                host="localhost",
                port="5432",
                connect_timeout=10
            )
            conn.set_session(autocommit=False)
            cursor = conn.cursor()
        except Exception as e:
            print(f"Failed to reconnect to database: {e}")

# Create table if it doesn't exist for frauds with enhanced schema
cursor.execute("""
    CREATE TABLE IF NOT EXISTS frauds (
        transaction_id TEXT PRIMARY KEY,
        user_id INT,
        amount FLOAT,
        currency TEXT,
        location TEXT,
        timestamp FLOAT,
        transaction_type TEXT,
        merchant_id TEXT,
        merchant_name TEXT,
        merchant_category TEXT,
        payment_method TEXT,
        device_type TEXT,
        ip_address TEXT,
        is_confirmed_fraud BOOLEAN DEFAULT FALSE,
        detection_score FLOAT,
        risk_level TEXT,
        detection_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        detection_features JSONB,
        notes TEXT,
        model_used TEXT DEFAULT 'global'
    )
""")
conn.commit()
print("Verified frauds table schema")

# Create table for processing stats if it doesn't exist
cursor.execute("""
    CREATE TABLE IF NOT EXISTS processing_stats (
        counter_name TEXT PRIMARY KEY,
        count_value BIGINT,
        last_updated_timestamp TIMESTAMP WITH TIME ZONE
    )
""")
conn.commit()

# Initialize total_transactions_processed counter if it doesn't exist
cursor.execute("""
    INSERT INTO processing_stats (counter_name, count_value, last_updated_timestamp)
    VALUES ('total_transactions_processed', 0, NOW())
    ON CONFLICT (counter_name) DO NOTHING;
""")
conn.commit()

print("Listening for transactions...")

# Buffer to hold incoming messages
batch = []
BATCH_SIZE = 10  # We'll keep the batch processing but enhance it

for msg in consumer:
    txn = msg.value
    
    # First, store this transaction in the history for future model training
    user_manager.store_transaction(txn)
    
    batch.append(txn)

    if len(batch) >= BATCH_SIZE:
        # Increment total processed transactions count
        num_in_batch = len(batch)
        try:
            cursor.execute("""
                UPDATE processing_stats
                SET count_value = count_value + %s,
                    last_updated_timestamp = NOW()
                WHERE counter_name = 'total_transactions_processed'
            """, (num_in_batch,))
            conn.commit()
            print(f"Incremented total_transactions_processed by {num_in_batch} and updated timestamp")
        except Exception as e:
            print(f"Failed to update transaction count: {e}")
            conn.rollback()
            reconnect_db()

        # Process each transaction - try user model first, fall back to batch model
        user_scored_txns = []
        batch_process_txns = []
        
        for txn in batch:
            user_id = txn.get('user_id')
            
            # Check if we need to update the user's profile and model
            # In production, you might want to do this less frequently
            user_manager.update_user_profile(user_id)
            
            # Try to score with user model
            user_score = user_manager.score_transaction(txn)
            
            if user_score:
                # User model available, use that result
                txn['detection_score'] = user_score['score']
                txn['risk_level'] = user_score['risk_level']
                txn['anomaly'] = 1 if user_score['is_anomaly'] else 0
                txn['model_used'] = 'user'
                user_scored_txns.append(txn)
            else:
                # No user model available, add to batch for global model
                batch_process_txns.append(txn)
                
        # Now create DataFrame only for transactions that need global model
        if batch_process_txns:
            df = pd.DataFrame(batch_process_txns)
            
            try:
                # Similar feature extraction as before but with user models as fallback
                features = pd.DataFrame()
                
                # Basic transaction features
                features['amount'] = df['amount']
                
                # Add time-based features
                if 'timestamp' in df.columns:
                    timestamps = pd.to_datetime(df['timestamp'], unit='s')
                    features['hour_of_day'] = timestamps.dt.hour
                    features['day_of_week'] = timestamps.dt.dayofweek
                    features['is_weekend'] = (timestamps.dt.dayofweek >= 5).astype(int)
                    features['time_since_midnight'] = (timestamps.dt.hour * 3600 + 
                                                    timestamps.dt.minute * 60 + 
                                                    timestamps.dt.second) / 86400.0
                
                # One-hot encode categorical features
                if 'transaction_type' in df.columns:
                    transaction_type_dummies = pd.get_dummies(df['transaction_type'], prefix='txn_type')
                    features = pd.concat([features, transaction_type_dummies], axis=1)
                
                if 'location' in df.columns:
                    location_dummies = pd.get_dummies(df['location'], prefix='loc')
                    features = pd.concat([features, location_dummies], axis=1)
                    
                if 'merchant' in df.columns:
                    if isinstance(df['merchant'].iloc[0], dict) and 'category' in df['merchant'].iloc[0]:
                        merchant_categories = df['merchant'].apply(lambda x: x.get('category', 'Unknown') if isinstance(x, dict) else 'Unknown')
                        merchant_dummies = pd.get_dummies(merchant_categories, prefix='merch')
                        features = pd.concat([features, merchant_dummies], axis=1)
                        
                if 'payment_method' in df.columns:
                    payment_dummies = pd.get_dummies(df['payment_method'], prefix='payment')
                    features = pd.concat([features, payment_dummies], axis=1)
                    
                if 'device_info' in df.columns and isinstance(df['device_info'].iloc[0], dict):
                    device_types = df['device_info'].apply(lambda x: x.get('type', 'Unknown') if isinstance(x, dict) else 'Unknown')
                    device_dummies = pd.get_dummies(device_types, prefix='device')
                    features = pd.concat([features, device_dummies], axis=1)
                
                # Handle NaN values
                features = features.fillna(0)
                
                # Scale numerical features
                from sklearn.preprocessing import StandardScaler
                numeric_features = ['amount']
                if 'hour_of_day' in features.columns:
                    numeric_features.extend(['hour_of_day', 'day_of_week', 'time_since_midnight'])
                    
                if numeric_features and not features.empty:
                    scaler = StandardScaler()
                    features[numeric_features] = scaler.fit_transform(features[numeric_features])
                
                # Only train model if we have data needing the global model
                if not features.empty:
                    # Train the isolation forest model
                    model = IForest(
                        contamination=0.1,
                        n_estimators=100,
                        max_samples='auto',
                        random_state=42
                    )
                    model.fit(features)
                    
                    # Strip column names to avoid warnings
                    feature_matrix = features.values
                    
                    # Get anomaly scores
                    anomaly_scores = model.decision_function(feature_matrix)
                    
                    # Normalize scores to 0-1 range
                    from sklearn.preprocessing import MinMaxScaler
                    score_scaler = MinMaxScaler()
                    normalized_scores = score_scaler.fit_transform(anomaly_scores.reshape(-1, 1)).flatten()
                    
                    df['detection_score'] = normalized_scores
                    df['model_used'] = 'global'
                    
                    # Predict anomalies (1 = anomaly, 0 = normal)
                    df['anomaly'] = model.predict(feature_matrix)
                    
                    # Add risk levels
                    df['risk_level'] = pd.cut(
                        df['detection_score'], 
                        bins=[0, 0.6, 0.8, 1.0], 
                        labels=['low', 'medium', 'high']
                    )
            
            except Exception as e:
                print(f"Error processing batch with global model: {e}")
                # Continue to process user-scored transactions
                df = pd.DataFrame()
        
        # Combine user-scored and batch-processed transactions
        if user_scored_txns and not df.empty:
            # Create a DataFrame for user-scored transactions
            user_df = pd.DataFrame(user_scored_txns)
            # Combine with batch-processed
            combined_df = pd.concat([user_df, df])
            # Use the combined DataFrame for further processing
            df = combined_df
        elif user_scored_txns:
            # Only user-scored transactions
            df = pd.DataFrame(user_scored_txns)
        # If only batch-processed, df is already set
        
        # Get anomalies
        if not df.empty and 'anomaly' in df.columns:
            anomalies = df[df['anomaly'] == 1]
            
            for _, row in anomalies.iterrows():
                # Extract merchant info if available
                merchant_id = "unknown"
                merchant_name = "unknown"
                merchant_category = "unknown"
                if 'merchant' in row and isinstance(row.merchant, dict):
                    merchant_id = row.merchant.get('merchant_id', "unknown")
                    merchant_name = row.merchant.get('name', "unknown")
                    merchant_category = row.merchant.get('category', "unknown")
                
                # Extract device info if available
                device_type = "unknown"
                ip_address = "unknown"
                if 'device_info' in row and isinstance(row.device_info, dict):
                    device_type = row.device_info.get('type', "unknown")
                    ip_address = row.device_info.get('ip_address', "unknown")
                
                # Get payment method if available
                payment_method = row.get('payment_method', "unknown")
                
                # Get transaction type if available
                transaction_type = row.get('transaction_type', "unknown")
                
                # Get currency if available
                currency = row.get('currency', "USD")
                
                # Get transaction ID if available, otherwise generate one
                transaction_id = row.get('transaction_id', f"AUTOGEN-{int(time.time())}-{row.user_id}")
                
                # Get risk level if available
                risk_level = row.get('risk_level', 'medium')
                
                # Get model used
                model_used = row.get('model_used', 'global')
                
                # Capture the most important features that contributed to the detection
                feature_dict = {}
                if 'features' in locals() and isinstance(features, pd.DataFrame) and not features.empty:
                    # Get the row of features for this transaction
                    idx = df.index[df['transaction_id'] == transaction_id][0] if 'transaction_id' in df.columns else _
                    try:
                        row_features = features.iloc[idx].to_dict()
                        # Keep the top 5 most important features
                        sorted_features = sorted(row_features.items(), key=lambda x: abs(x[1]) if isinstance(x[1], (int, float)) else 0, reverse=True)
                        feature_dict = {k: float(v) if isinstance(v, (int, float)) else str(v) for k, v in sorted_features[:5]}
                    except:
                        # Can't get features, just use a placeholder
                        feature_dict = {"info": "Features not available"}
                
                try:
                    # Insert into frauds table with model used
                    cursor.execute("""
                        INSERT INTO frauds (
                            transaction_id, user_id, amount, currency, location, timestamp, 
                            transaction_type, merchant_id, merchant_name, merchant_category,
                            payment_method, device_type, ip_address, detection_score, risk_level,
                            detection_features, model_used
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (transaction_id) DO UPDATE SET
                            detection_score = EXCLUDED.detection_score,
                            risk_level = EXCLUDED.risk_level,
                            detection_features = EXCLUDED.detection_features,
                            detection_time = NOW(),
                            model_used = EXCLUDED.model_used
                    """, (
                        transaction_id,
                        int(row.user_id),
                        float(row.amount),
                        currency,
                        row.location,
                        float(row.timestamp),
                        transaction_type,
                        merchant_id,
                        merchant_name,
                        merchant_category,
                        payment_method,
                        device_type,
                        ip_address,
                        float(row.detection_score),
                        risk_level,
                        json.dumps(feature_dict),
                        model_used
                    ))
                except Exception as e:
                    print(f"Error inserting anomaly: {e}")
                    conn.rollback()
                    continue

            try:
                conn.commit()
                print(f"Inserted {len(anomalies)} anomalies")
                
                # Print detailed information about each detected anomaly
                if not anomalies.empty:
                    print("-" * 40 + " DETECTED ANOMALIES " + "-" * 40)
                    for _, anomaly in anomalies.iterrows():
                        anomaly_info = {
                            "transaction_id": anomaly.get('transaction_id', 'Unknown'),
                            "user_id": int(anomaly.user_id),
                            "amount": float(anomaly.amount),
                            "location": anomaly.get('location', 'Unknown'),
                            "timestamp": anomaly.get('timestamp', 'Unknown'),
                            "detection_score": float(anomaly.detection_score),
                            "risk_level": str(anomaly.risk_level),
                            "merchant_category": merchant_category if merchant_category != "unknown" else "Unknown",
                            "payment_method": payment_method,
                            "transaction_type": transaction_type,
                            "model_used": anomaly.get('model_used', 'global'),
                            "_anomalous": bool(anomaly.get('_anomalous', False))
                        }
                        print(json.dumps(anomaly_info, indent=2))
                        print("-" * 90)
                        
                        # If this is a ground truth anomaly, train the user model
                        # In production you'd handle user feedback separately
                        if anomaly.get('_anomalous', False):
                            user_id = anomaly.user_id
                            print(f"Training model for user {user_id} based on confirmed anomaly")
                            user_manager.train_user_model(user_id)
            except Exception as e:
                print(f"Failed to insert anomalies: {e}")
                conn.rollback()
                reconnect_db()
                continue

            # Update performance metrics if we have ground truth
            try:
                has_ground_truth = '_anomalous' in df.columns
                
                if has_ground_truth:
                    true_anomalies = df[df['_anomalous'] == True]
                    detected_anomalies = df[df['anomaly'] == 1]
                    
                    # Calculate metrics
                    true_positives = len(df[(df['_anomalous'] == True) & (df['anomaly'] == 1)])
                    false_positives = len(df[(df['_anomalous'] != True) & (df['anomaly'] == 1)])
                    false_negatives = len(df[(df['_anomalous'] == True) & (df['anomaly'] == 0)])
                    
                    # Calculate precision, recall, etc.
                    precision = true_positives / max(len(detected_anomalies), 1)
                    recall = true_positives / max(len(true_anomalies), 1)
                    f1_score = 2 * precision * recall / max((precision + recall), 0.001)
                    
                    # Save metrics to database
                    cursor.execute("""
                        INSERT INTO processing_stats 
                        (counter_name, count_value, last_updated_timestamp)
                        VALUES 
                        ('precision', %s, NOW()),
                        ('recall', %s, NOW()),
                        ('f1_score', %s, NOW())
                        ON CONFLICT (counter_name) DO UPDATE 
                        SET count_value = EXCLUDED.count_value,
                            last_updated_timestamp = NOW()
                    """, (int(precision * 100), int(recall * 100), int(f1_score * 100)))
                    
                    try:
                        conn.commit()
                        print(f"Model Performance - Precision: {precision:.2f}, Recall: {recall:.2f}, F1: {f1_score:.2f}")
                    except Exception as e:
                        print(f"Failed to save performance metrics: {e}")
                        conn.rollback()
            
            except Exception as e:
                print(f"Failed to compute performance metrics: {e}")
                conn.rollback()
        
        # Clear the batch
        batch = []
        
        # Every 100 transactions, check if we can train models for users
        total_processed = 0
        try:
            cursor.execute("SELECT count_value FROM processing_stats WHERE counter_name = 'total_transactions_processed'")
            result = cursor.fetchone()
            if result:
                total_processed = result[0]
        except:
            pass
            
        if total_processed % 100 < BATCH_SIZE:
            print("Checking for users who need model updates...")
            try:
                # Get users with enough transaction history but no model
                cursor.execute("""
                    SELECT DISTINCT user_id FROM transaction_history
                    GROUP BY user_id
                    HAVING COUNT(*) >= 30
                    LIMIT 5
                """)
                
                users_for_training = [row[0] for row in cursor.fetchall()]
                
                for user_id in users_for_training:
                    print(f"Training model for user {user_id}")
                    user_manager.train_user_model(user_id)
                    
            except Exception as e:
                print(f"Error during model training: {e}")
