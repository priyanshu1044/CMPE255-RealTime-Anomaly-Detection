from kafka import KafkaConsumer
from pyod.models.iforest import IForest
import pandas as pd
import psycopg2
import json
import time
import os
import sys
import subprocess

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
    
    print("Database schema verified successfully")

# Run schema check at startup
check_database_schema()

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
    # Add connection pool settings and timeout
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
        notes TEXT
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
# Also set a default last_updated_timestamp
cursor.execute("""
    INSERT INTO processing_stats (counter_name, count_value, last_updated_timestamp)
    VALUES ('total_transactions_processed', 0, NOW())
    ON CONFLICT (counter_name) DO NOTHING;
""")
conn.commit()

print("Listening for transactions...")

# Buffer to hold incoming messages
batch = []
BATCH_SIZE = 10

for msg in consumer:
    txn = msg.value
    batch.append(txn)

    if len(batch) >= BATCH_SIZE:
        # Increment total processed transactions count and update timestamp
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
            conn.rollback()  # Rollback the failed transaction
            # Try to reconnect if connection might be stale
            try:
                conn.close()
                conn = psycopg2.connect(
                    dbname="anomalies",
                    user="user",
                    password="pass",
                    host="localhost",
                    port="5432"
                )
                cursor = conn.cursor()
            except:
                print("Failed to reconnect to database")

        df = pd.DataFrame(batch)
        batch = []

        try:
            # Extract features for anomaly detection
            # We'll use more features than just amount now
            features = pd.DataFrame()
            
            # Basic transaction features
            features['amount'] = df['amount']
            
            # Add time-based features
            if 'timestamp' in df.columns:
                # Convert timestamp to datetime
                timestamps = pd.to_datetime(df['timestamp'], unit='s')
                # Extract time components
                features['hour_of_day'] = timestamps.dt.hour
                features['day_of_week'] = timestamps.dt.dayofweek
                features['is_weekend'] = (timestamps.dt.dayofweek >= 5).astype(int)
                # Calculate time since midnight
                features['time_since_midnight'] = (timestamps.dt.hour * 3600 + 
                                                timestamps.dt.minute * 60 + 
                                                timestamps.dt.second) / 86400.0
            
            # One-hot encode transaction_type
            if 'transaction_type' in df.columns:
                transaction_type_dummies = pd.get_dummies(df['transaction_type'], prefix='txn_type')
                features = pd.concat([features, transaction_type_dummies], axis=1)
            
            # One-hot encode location
            if 'location' in df.columns:
                location_dummies = pd.get_dummies(df['location'], prefix='loc')
                features = pd.concat([features, location_dummies], axis=1)
                
            # One-hot encode merchant category if available
            if 'merchant' in df.columns:
                if isinstance(df['merchant'].iloc[0], dict) and 'category' in df['merchant'].iloc[0]:
                    merchant_categories = df['merchant'].apply(lambda x: x.get('category', 'Unknown') if isinstance(x, dict) else 'Unknown')
                    merchant_dummies = pd.get_dummies(merchant_categories, prefix='merch')
                    features = pd.concat([features, merchant_dummies], axis=1)
                    
            # One-hot encode payment methods
            if 'payment_method' in df.columns:
                payment_dummies = pd.get_dummies(df['payment_method'], prefix='payment')
                features = pd.concat([features, payment_dummies], axis=1)
                
            # One-hot encode device types
            if 'device_info' in df.columns and isinstance(df['device_info'].iloc[0], dict):
                device_types = df['device_info'].apply(lambda x: x.get('type', 'Unknown') if isinstance(x, dict) else 'Unknown')
                device_dummies = pd.get_dummies(device_types, prefix='device')
                features = pd.concat([features, device_dummies], axis=1)
            
            # Prepare features - handle NaN values
            features = features.fillna(0)
            
            # Scale numerical features if needed
            from sklearn.preprocessing import StandardScaler
            numeric_features = ['amount']
            if 'hour_of_day' in features.columns:
                numeric_features.extend(['hour_of_day', 'day_of_week', 'time_since_midnight'])
                
            if numeric_features:
                scaler = StandardScaler()
                features[numeric_features] = scaler.fit_transform(features[numeric_features])
            
            # Train the isolation forest model with optimized parameters
            model = IForest(
                contamination=0.1,  # Expect about 10% anomalies
                n_estimators=100,   # More trees for better accuracy
                max_samples='auto', # Automatically determine samples
                random_state=42     # For reproducibility
            )
            model.fit(features)
            
            # Strip column names before passing to the model to avoid warnings
            feature_matrix = features.values
            
            # Get anomaly scores (higher = more anomalous)
            anomaly_scores = model.decision_function(feature_matrix)
            
            # Normalize scores to 0-1 range for easier interpretation
            from sklearn.preprocessing import MinMaxScaler
            score_scaler = MinMaxScaler()
            normalized_scores = score_scaler.fit_transform(anomaly_scores.reshape(-1, 1)).flatten()
            
            df['detection_score'] = normalized_scores
            
            # Predict anomalies (1 = anomaly, 0 = normal)
            df['anomaly'] = model.predict(feature_matrix)
            
            # Add confidence level categories
            df['risk_level'] = pd.cut(
                df['detection_score'], 
                bins=[0, 0.6, 0.8, 1.0], 
                labels=['low', 'medium', 'high']
            )

            # Get anomalies
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
                
                # Capture the most important features that contributed to the detection
                # This helps with explainability
                feature_dict = {}
                if isinstance(features, pd.DataFrame) and not features.empty:
                    # Get the row of features for this transaction
                    idx = df.index[df['transaction_id'] == transaction_id][0] if 'transaction_id' in df.columns else _
                    row_features = features.iloc[idx].to_dict()
                    
                    # Only keep the top 5 most important features
                    sorted_features = sorted(row_features.items(), key=lambda x: abs(x[1]) if isinstance(x[1], (int, float)) else 0, reverse=True)
                    feature_dict = {k: float(v) if isinstance(v, (int, float)) else str(v) for k, v in sorted_features[:5]}
                
                try:
                    # First, verify frauds table exists with the correct schema
                    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'frauds' ORDER BY ordinal_position")
                    columns = [col[0] for col in cursor.fetchall()]
                    
                    required_columns = ["transaction_id", "user_id", "amount", "currency", "location", "timestamp", 
                                        "transaction_type", "merchant_id", "merchant_name", "merchant_category",
                                        "payment_method", "device_type", "ip_address", "detection_score", "risk_level",
                                        "detection_features"]
                    
                    missing_columns = [col for col in required_columns if col not in columns]
                    if missing_columns:
                        print(f"Error: Missing columns in frauds table: {missing_columns}")
                        print("Attempting to recreate table with correct schema...")
                        cursor.execute("DROP TABLE IF EXISTS frauds")
                        cursor.execute("""
                            CREATE TABLE frauds (
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
                                notes TEXT
                            )
                        """)
                        conn.commit()
                        print("Recreated frauds table with correct schema")
                    
                    # Now insert the record
                    cursor.execute("""
                        INSERT INTO frauds (
                            transaction_id, user_id, amount, currency, location, timestamp, 
                            transaction_type, merchant_id, merchant_name, merchant_category,
                            payment_method, device_type, ip_address, detection_score, risk_level,
                            detection_features
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (transaction_id) DO UPDATE SET
                            detection_score = EXCLUDED.detection_score,
                            risk_level = EXCLUDED.risk_level,
                            detection_features = EXCLUDED.detection_features,
                            detection_time = NOW()
                    """, (
                        transaction_id,
                        int(row.user_id),  # Ensure proper type conversion
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
                        json.dumps(feature_dict)
                    ))
                except Exception as e:
                    print(f"Error during insert attempt: {e}")
                    # If the table is missing, let's recreate it
                    if "relation" in str(e) and "does not exist" in str(e):
                        try:
                            cursor.execute("DROP TABLE IF EXISTS frauds")
                            cursor.execute("""
                                CREATE TABLE frauds (
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
                                    notes TEXT
                                )
                            """)
                            conn.commit()
                            print("Created missing frauds table, retrying insert")
                            
                            # Retry the insert
                            cursor.execute("""
                                INSERT INTO frauds (
                                    transaction_id, user_id, amount, currency, location, timestamp, 
                                    transaction_type, merchant_id, merchant_name, merchant_category,
                                    payment_method, device_type, ip_address, detection_score, risk_level,
                                    detection_features
                                )
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                                json.dumps(feature_dict)
                            ))
                        except Exception as inner_e:
                            print(f"Second attempt also failed: {inner_e}")
                            conn.rollback()
                    else:
                        conn.rollback()

            try:
                conn.commit()
                print(f"Inserted {len(anomalies)} anomalies")
                
                # Print detailed information about each detected anomaly
                if anomalies.shape[0] > 0:
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
                            "_anomalous": bool(anomaly.get('_anomalous', False))  # Whether it was intentionally anomalous
                        }
                        print(json.dumps(anomaly_info, indent=2))
                        print("-" * 90)
            except Exception as e:
                print(f"Failed to insert anomalies: {e}")
                conn.rollback()
                # Try to reconnect if connection might be stale
                try:
                    conn.close()
                    conn = psycopg2.connect(
                        dbname="anomalies",
                        user="user",
                        password="pass",
                        host="localhost",
                        port="5432"
                    )
                    cursor = conn.cursor()
                except:
                    print("Failed to reconnect to database")
                continue

            # Update performance metrics
            try:
                # Compute performance metrics if we have ground truth
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

        except Exception as e:
            print("Anomaly detection failed:", e)
            # Make sure we rollback any failed transaction
            try:
                conn.rollback()
            except:
                pass
            continue
