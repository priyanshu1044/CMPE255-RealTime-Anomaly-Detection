import psycopg2
import sys
import os
import time

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def init_database():
    """Initialize the database with the required tables and schema"""
    print("Initializing database...")
    
    # Connection parameters - should match those in your application
    conn_params = {
        "dbname": "anomalies",
        "user": "user",
        "password": "pass",
        "host": "localhost",
        "port": "5432"
    }
    
    # Try to connect multiple times in case database is starting up
    max_retries = 5
    retry_delay = 3
    
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(**conn_params)
            conn.set_session(autocommit=False)
            cursor = conn.cursor()
            break
        except psycopg2.Error as e:
            if attempt < max_retries - 1:
                print(f"Failed to connect (attempt {attempt+1}/{max_retries}): {e}")
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print(f"Failed to connect after {max_retries} attempts: {e}")
                print("Ensure PostgreSQL is running and the credentials are correct.")
                return False
    
    try:
        # Check if tables exist first
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'frauds')")
        frauds_exists = cursor.fetchone()[0]
        
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'processing_stats')")
        stats_exists = cursor.fetchone()[0]
        
        # Only create tables if they don't exist - preserving data
        print("Verifying database tables...")
        
        # Create frauds table if it doesn't exist
        if not frauds_exists:
            print("Creating frauds table...")
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
        else:
            print("Frauds table already exists, checking schema...")
            # Check if all required columns exist
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'frauds'
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            required_columns = ["transaction_id", "user_id", "amount", "currency", 
                              "location", "timestamp", "transaction_type", "merchant_id", 
                              "merchant_name", "merchant_category", "payment_method", 
                              "device_type", "ip_address", "detection_score", "risk_level", 
                              "detection_features"]
            missing_columns = [col for col in required_columns if col not in existing_columns]
            
            # Add model_used column if it doesn't exist
            if "model_used" not in existing_columns:
                print("Adding model_used column to frauds table")
                cursor.execute("ALTER TABLE frauds ADD COLUMN model_used TEXT DEFAULT 'global'")
            
            # Add any missing columns
            for col in missing_columns:
                print(f"Adding missing column: {col}")
                if col == "detection_features":
                    cursor.execute(f"ALTER TABLE frauds ADD COLUMN {col} JSONB")
                elif col == "risk_level":
                    cursor.execute(f"ALTER TABLE frauds ADD COLUMN {col} TEXT")
                elif col in ["user_id"]:
                    cursor.execute(f"ALTER TABLE frauds ADD COLUMN {col} INT")
                elif col in ["amount", "timestamp", "detection_score"]:
                    cursor.execute(f"ALTER TABLE frauds ADD COLUMN {col} FLOAT")
                else:
                    cursor.execute(f"ALTER TABLE frauds ADD COLUMN {col} TEXT")
        
        # Create processing_stats table
        if not stats_exists:
            print("Creating processing_stats table...")
            cursor.execute("""
                CREATE TABLE processing_stats (
                    counter_name TEXT PRIMARY KEY,
                    count_value BIGINT,
                    last_updated_timestamp TIMESTAMP WITH TIME ZONE
                )
            """)
        else:
            print("Processing stats table already exists")
        
        # Check if user_profiles table exists and has the needed columns for frontend
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles')")
        user_profiles_exists = cursor.fetchone()[0]
        
        if user_profiles_exists:
            print("Checking user_profiles table schema for frontend compatibility...")
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'user_profiles'
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            
            # Check for frontend-required columns
            required_columns = ["avg_transaction_amount", "model_score", "merchant_categories", "device_types"]
            for col in required_columns:
                if col not in existing_columns:
                    print(f"Adding missing column {col} to user_profiles table")
                    if col in ["avg_transaction_amount", "model_score"]:
                        default_val = "100.0" if col == "avg_transaction_amount" else "0.5"
                        cursor.execute(f"ALTER TABLE user_profiles ADD COLUMN {col} FLOAT DEFAULT {default_val}")
                    else:
                        cursor.execute(f"ALTER TABLE user_profiles ADD COLUMN {col} JSONB DEFAULT '[]'")
        else:
            print("Creating user_profiles table...")
            cursor.execute("""
                CREATE TABLE user_profiles (
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
        
        # Initialize counters if needed
        print("Ensuring performance metrics are initialized...")
        cursor.execute("""
            INSERT INTO processing_stats (counter_name, count_value, last_updated_timestamp)
            VALUES 
            ('total_transactions_processed', 0, NOW()),
            ('precision', 0, NOW()),
            ('recall', 0, NOW()),
            ('f1_score', 0, NOW())
            ON CONFLICT (counter_name) DO NOTHING
        """)
        
        conn.commit()
        print("Database initialization complete!")
        return True
    
    except psycopg2.Error as e:
        print(f"Error initializing database: {e}")
        conn.rollback()
        return False
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success = init_database()
    if success:
        print("Database setup completed successfully")
        sys.exit(0)
    else:
        print("Database setup failed")
        sys.exit(1)
