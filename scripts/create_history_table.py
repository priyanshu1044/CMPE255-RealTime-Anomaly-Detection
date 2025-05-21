import psycopg2
import sys
import os

def create_transaction_history_table():
    """Create a table to store transaction history for user behavior analysis"""
    conn = None
    try:
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
        
        # Create user profiles table first (must exist before transaction_history due to FK constraint)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INT PRIMARY KEY,
                usual_locations JSONB,
                usual_merchants JSONB,
                typical_min_amount FLOAT,
                typical_max_amount FLOAT,
                typical_payment_methods JSONB,
                typical_transaction_times JSONB,
                avg_transaction_amount FLOAT DEFAULT 100.0,
                model_score FLOAT DEFAULT 0.5,
                merchant_categories JSONB,
                device_types JSONB,
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        
        # Create table for transaction history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transaction_history (
                transaction_id TEXT PRIMARY KEY,
                user_id INT NOT NULL,
                amount FLOAT NOT NULL,
                currency TEXT,
                location TEXT,
                timestamp FLOAT,
                transaction_type TEXT,
                merchant_category TEXT,
                payment_method TEXT,
                device_type TEXT,
                is_anomalous BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        
        # Populate user profiles table with IDs from simulation
        print("Pre-populating user_profiles table with IDs...")
        for user_id in range(1, 101):
            cursor.execute("""
                INSERT INTO user_profiles (user_id)
                VALUES (%s)
                ON CONFLICT (user_id) DO NOTHING
            """, (user_id,))
        print("Added 100 user profiles")
        
        # Create indices for faster lookups
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_txn_history_user_id ON transaction_history(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_txn_history_timestamp ON transaction_history(timestamp)")
        
        conn.commit()
        print("Transaction history table created successfully")
        
    except Exception as e:
        print(f"Error creating transaction history table: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_transaction_history_table()
