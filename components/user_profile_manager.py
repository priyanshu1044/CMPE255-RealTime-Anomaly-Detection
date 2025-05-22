"""User Profile Manager Module
Contributors:
Kenil Gopani: Implemented the enhanced anomaly detection logic with user profiling and adaptive thresholds. Optimized model performance, managed containerized deployment infrastructure, and handled scalability testing under high-load scenarios.
"""

import psycopg2
import json
import pandas as pd
import numpy as np
from pyod.models.iforest import IForest
import pickle
from sklearn.preprocessing import StandardScaler
import os

class UserProfileManager:
    """Class to manage user profiles and transaction history for anomaly detection"""
    
    def __init__(self):
        """Initialize the user profile manager"""
        self.conn = psycopg2.connect(
            dbname="anomalies",
            user="user",
            password="pass",
            host="localhost",
            port="5432",
            connect_timeout=10
        )
        self.conn.set_session(autocommit=False)
        self.cursor = self.conn.cursor()
        
        # Create directory for storing user models if it doesn't exist
        self.models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
        os.makedirs(self.models_dir, exist_ok=True)
    
    def store_transaction(self, transaction):
        """Store a transaction in the history table"""
        try:
            # Extract merchant category
            merchant_category = "Unknown"
            if 'merchant' in transaction and isinstance(transaction['merchant'], dict):
                merchant_category = transaction['merchant'].get('category', 'Unknown')
            
            # Extract device type
            device_type = "Unknown"
            if 'device_info' in transaction and isinstance(transaction['device_info'], dict):
                device_type = transaction['device_info'].get('type', 'Unknown')
            
            # Ensure user profile exists
            user_id = transaction['user_id']
            self.cursor.execute("SELECT 1 FROM user_profiles WHERE user_id = %s", (user_id,))
            if not self.cursor.fetchone():
                # Create user profile if it doesn't exist
                print(f"Creating missing user profile for user_id {user_id}")
                self.cursor.execute("""
                    INSERT INTO user_profiles (user_id)
                    VALUES (%s)
                    ON CONFLICT (user_id) DO NOTHING
                """, (user_id,))
                self.conn.commit()
            
            # Now insert the transaction
            self.cursor.execute("""
                INSERT INTO transaction_history (
                    transaction_id, user_id, amount, currency, location, timestamp,
                    transaction_type, merchant_category, payment_method, device_type,
                    is_anomalous
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (transaction_id) DO NOTHING
            """, (
                transaction['transaction_id'],
                user_id,
                transaction['amount'],
                transaction.get('currency', 'USD'),
                transaction.get('location', 'Unknown'),
                transaction.get('timestamp', 0),
                transaction.get('transaction_type', 'Unknown'),
                merchant_category,
                transaction.get('payment_method', 'Unknown'),
                device_type,
                transaction.get('_anomalous', False)
            ))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error storing transaction: {e}")
            self.conn.rollback()
            return False
    
    def update_user_profile(self, user_id):
        """Update a user's profile based on their transaction history"""
        try:
            # Get user's transaction history
            self.cursor.execute("""
                SELECT location, merchant_category, amount, payment_method, 
                    EXTRACT(HOUR FROM to_timestamp(timestamp)) as hour
                FROM transaction_history
                WHERE user_id = %s AND is_anomalous = FALSE
                ORDER BY timestamp DESC
                LIMIT 100
            """, (user_id,))
            
            rows = self.cursor.fetchall()
            if not rows:
                return False
                
            # Extract data
            locations = [row[0] for row in rows if row[0] != 'Unknown']
            merchants = [row[1] for row in rows if row[1] != 'Unknown']
            amounts = [row[2] for row in rows]
            payment_methods = [row[3] for row in rows if row[3] != 'Unknown']
            hours = [int(row[4]) for row in rows]
            
            # Calculate profile attributes
            usual_locations = list(set([loc for loc in locations if locations.count(loc) >= 2]))
            usual_merchants = list(set([merch for merch in merchants if merchants.count(merch) >= 2]))
            
            if amounts:
                # Convert numpy values to Python native float types
                # Using float() conversion to ensure we don't pass numpy types to SQL
                typical_min_amount = float(max(5, np.percentile(amounts, 5)))
                typical_max_amount = float(np.percentile(amounts, 95))
                # Calculate average transaction amount for the frontend
                avg_transaction_amount = float(np.mean(amounts))
            else:
                typical_min_amount = 5.0
                typical_max_amount = 1000.0
                avg_transaction_amount = 100.0
                
            typical_payment_methods = list(set([pm for pm in payment_methods if payment_methods.count(pm) >= 2]))
            typical_transaction_times = list(set([h for h in hours if hours.count(h) >= 2]))
            
            # Generate a simple model score (placeholder)
            model_score = float(min(len(usual_locations) * 0.1 + len(usual_merchants) * 0.05 + 0.5, 1.0))
            
            # Get device types for frontend
            self.cursor.execute("""
                SELECT DISTINCT device_type FROM transaction_history 
                WHERE user_id = %s AND device_type != 'Unknown' 
                LIMIT 10
            """, (user_id,))
            device_types = [row[0] for row in self.cursor.fetchall()]
            
            # Update user profile with new fields for frontend compatibility
            self.cursor.execute("""
                INSERT INTO user_profiles (
                    user_id, usual_locations, usual_merchants, 
                    typical_min_amount, typical_max_amount, 
                    typical_payment_methods, typical_transaction_times,
                    avg_transaction_amount, model_score, merchant_categories, device_types,
                    last_updated
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    usual_locations = EXCLUDED.usual_locations,
                    usual_merchants = EXCLUDED.usual_merchants,
                    typical_min_amount = EXCLUDED.typical_min_amount,
                    typical_max_amount = EXCLUDED.typical_max_amount,
                    typical_payment_methods = EXCLUDED.typical_payment_methods,
                    typical_transaction_times = EXCLUDED.typical_transaction_times,
                    avg_transaction_amount = EXCLUDED.avg_transaction_amount,
                    model_score = EXCLUDED.model_score,
                    merchant_categories = EXCLUDED.merchant_categories,
                    device_types = EXCLUDED.device_types,
                    last_updated = NOW()
            """, (
                user_id,
                json.dumps(usual_locations),
                json.dumps(usual_merchants),
                typical_min_amount,
                typical_max_amount,
                json.dumps(typical_payment_methods),
                json.dumps(typical_transaction_times),
                avg_transaction_amount,
                model_score,
                json.dumps(usual_merchants),  # reusing merchants as categories for simplicity
                json.dumps(device_types)
            ))
            
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error updating user profile: {e}")
            self.conn.rollback()
            return False
    
    def train_user_model(self, user_id, min_transactions=20):
        """Train an anomaly detection model for a specific user"""
        try:
            # Get user's transaction history
            self.cursor.execute("""
                SELECT amount, location, transaction_type, merchant_category, 
                       payment_method, device_type, timestamp,
                       EXTRACT(HOUR FROM to_timestamp(timestamp)) as hour_of_day,
                       EXTRACT(DOW FROM to_timestamp(timestamp)) as day_of_week
                FROM transaction_history
                WHERE user_id = %s AND is_anomalous = FALSE
                ORDER BY timestamp DESC
                LIMIT 200
            """, (user_id,))
            
            rows = self.cursor.fetchall()
            if len(rows) < min_transactions:
                print(f"Not enough transactions for user {user_id} to train a model")
                return False
            
            # Convert to DataFrame for easier processing
            df = pd.DataFrame(rows, columns=[
                'amount', 'location', 'transaction_type', 'merchant_category', 
                'payment_method', 'device_type', 'timestamp', 'hour_of_day', 'day_of_week'
            ])
            
            # Feature engineering
            features = pd.DataFrame()
            features['amount'] = df['amount']
            features['hour_of_day'] = df['hour_of_day']
            features['day_of_week'] = df['day_of_week']
            features['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
            
            # One-hot encoding for categorical features
            location_dummies = pd.get_dummies(df['location'], prefix='loc')
            txn_type_dummies = pd.get_dummies(df['transaction_type'], prefix='txn_type')
            merchant_dummies = pd.get_dummies(df['merchant_category'], prefix='merch')
            payment_dummies = pd.get_dummies(df['payment_method'], prefix='payment')
            device_dummies = pd.get_dummies(df['device_type'], prefix='device')
            
            # Combine features
            features = pd.concat([features, location_dummies, txn_type_dummies, merchant_dummies, 
                                 payment_dummies, device_dummies], axis=1)
            
            # Fill missing values
            features = features.fillna(0)
            
            # Scale numerical features
            numeric_features = ['amount', 'hour_of_day', 'day_of_week']
            scaler = StandardScaler()
            features[numeric_features] = scaler.fit_transform(features[numeric_features])
            
            # Train the model
            model = IForest(
                contamination=0.05,  # Lower contamination rate for user-specific models
                n_estimators=100,
                max_samples='auto',
                random_state=42
            )
            model.fit(features)
            
            # Save the model and scaler
            model_path = os.path.join(self.models_dir, f"user_{user_id}_model.pkl")
            scaler_path = os.path.join(self.models_dir, f"user_{user_id}_scaler.pkl")
            
            with open(model_path, 'wb') as f:
                pickle.dump(model, f)
            
            with open(scaler_path, 'wb') as f:
                pickle.dump(scaler, f)
            
            print(f"Trained and saved model for user {user_id}")
            return True
            
        except Exception as e:
            print(f"Error training user model: {e}")
            return False
    
    def score_transaction(self, transaction):
        """Score a transaction based on user-specific model if available"""
        user_id = transaction.get('user_id')
        if not user_id:
            return None
        
        model_path = os.path.join(self.models_dir, f"user_{user_id}_model.pkl")
        scaler_path = os.path.join(self.models_dir, f"user_{user_id}_scaler.pkl")
        
        # If user model exists, use it. Otherwise return None to use global model
        if not (os.path.exists(model_path) and os.path.exists(scaler_path)):
            return None
            
        try:
            # Load model and scaler
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
                
            with open(scaler_path, 'rb') as f:
                scaler = pickle.load(f)
            
            # Extract features from the transaction
            features = {}
            features['amount'] = transaction['amount']
            
            # Get hour and day from timestamp
            import datetime
            dt = datetime.datetime.fromtimestamp(transaction['timestamp'])
            features['hour_of_day'] = dt.hour
            features['day_of_week'] = dt.weekday()
            features['is_weekend'] = 1 if dt.weekday() >= 5 else 0
            
            # Categorical features
            location = transaction.get('location', 'Unknown')
            txn_type = transaction.get('transaction_type', 'Unknown')
            
            merchant_category = 'Unknown'
            if 'merchant' in transaction and isinstance(transaction['merchant'], dict):
                merchant_category = transaction['merchant'].get('category', 'Unknown')
                
            payment_method = transaction.get('payment_method', 'Unknown')
            
            device_type = 'Unknown'
            if 'device_info' in transaction and isinstance(transaction['device_info'], dict):
                device_type = transaction['device_info'].get('type', 'Unknown')
            
            # We need to one-hot encode these features in exactly the same way as during training
            # This is simplified for this example; in production, you'd want to save the encoders as well
            # Here we'll use a simpler approach to demonstrate the concept
            
            # Get user's profile to see what features we need to encode
            self.cursor.execute("SELECT * FROM user_profiles WHERE user_id = %s", (user_id,))
            profile = self.cursor.fetchone()
            
            if not profile:
                return None
                
            # Create a limited feature vector (in production, would match exactly what was used in training)
            feature_dict = {
                'amount': scaler.transform([[features['amount'], features['hour_of_day'], features['day_of_week']]])[0][0],
                'hour_of_day': scaler.transform([[features['amount'], features['hour_of_day'], features['day_of_week']]])[0][1],
                'day_of_week': scaler.transform([[features['amount'], features['hour_of_day'], features['day_of_week']]])[0][2],
                'is_weekend': features['is_weekend'],
                f'loc_{location}': 1,
                f'txn_type_{txn_type}': 1,
                f'merch_{merchant_category}': 1,
                f'payment_{payment_method}': 1,
                f'device_{device_type}': 1
            }
            
            # Convert to a format the model can use (simplified for demonstration)
            # In production, you would match the exact feature vector used during training
            # by saving the feature names and order during training
            X = np.zeros(30)  # Assuming model was trained with 30 features
            
            # Get anomaly score
            score = model.decision_function(np.array([X]))[0]
            
            # Normalize to 0-1 range (higher = more anomalous)
            normalized_score = (score - model.threshold_) / (model.threshold_ * 2)
            normalized_score = max(0, min(1, normalized_score))  # Clip to 0-1 range
            
            return {
                'score': normalized_score,
                'is_anomaly': model.predict(np.array([X]))[0] == 1,
                'risk_level': 'high' if normalized_score > 0.8 else 'medium' if normalized_score > 0.6 else 'low'
            }
            
        except Exception as e:
            print(f"Error scoring transaction with user model: {e}")
            return None
    
    def close(self):
        """Close the database connection"""
        if self.conn:
            self.conn.close()
    
    def __del__(self):
        """Clean up on object destruction"""
        self.close()
