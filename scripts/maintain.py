#!/usr/bin/env python3
"""
Maintenance script for the Real-Time Anomaly Detection System.
This provides a single interface for common maintenance tasks.
"""

import argparse
import os
import sys
import subprocess
import time
import psycopg2

def connect_to_db():
    """Connect to the database"""
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
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def run_command(args):
    """Run a Python script with specified arguments"""
    # Get the project root directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # Run the command from the project root directory to ensure imports work
    result = subprocess.run(args, check=False, cwd=base_dir)
    return result.returncode == 0

def init_database():
    """Initialize the database schema"""
    print("Initializing database schema...")
    
    # Run the init_db script first
    success = run_command([
        sys.executable, 
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "init_db.py")
    ])
    
    if not success:
        print("Failed to initialize core database schema.")
        return False
    
    # Then create history tables
    success = run_command([
        sys.executable, 
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "create_history_table.py")
    ])
    
    if not success:
        print("Failed to create history tables.")
        return False
    
    print("Database schema initialized successfully.")
    return True

def init_user_profiles():
    """Initialize user profiles from existing transaction history"""
    print("Initializing user profiles...")
    
    # Check if we have transaction history
    conn = connect_to_db()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM transaction_history")
            count = cursor.fetchone()[0]
            conn.close()
            
            if count == 0:
                print("No transactions found in history table.")
                print("You need to run the system first to collect transaction data.")
                return False
                
        except Exception as e:
            print(f"Error: {e}")
            print("The transaction_history table might not exist.")
            print("You need to initialize the database first.")
            return False
    
    # Run the init_user_profiles script
    success = run_command([
        sys.executable, 
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "init_user_profiles.py")
    ])
    
    if not success:
        print("Failed to initialize user profiles.")
        return False
        
    print("User profiles initialized successfully.")
    return True

def reset_database():
    """Reset the database by dropping all tables"""
    print("WARNING: This will delete ALL data in the database.")
    confirmation = input("Are you sure you want to continue? (yes/no): ")
    
    if confirmation.lower() != "yes":
        print("Operation cancelled.")
        return False
    
    conn = connect_to_db()
    if not conn:
        print("Failed to connect to database.")
        return False
        
    try:
        cursor = conn.cursor()
        print("Dropping tables...")
        
        # Drop all tables
        cursor.execute("""
            DROP TABLE IF EXISTS frauds CASCADE;
            DROP TABLE IF EXISTS processing_stats CASCADE;
            DROP TABLE IF EXISTS transaction_history CASCADE;
            DROP TABLE IF EXISTS user_profiles CASCADE;
        """)
        
        conn.commit()
        conn.close()
        print("Database reset successfully.")
        return True
    except Exception as e:
        print(f"Error resetting database: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def show_stats():
    """Show stats about the system"""
    conn = connect_to_db()
    if not conn:
        print("Failed to connect to database.")
        return False
        
    try:
        cursor = conn.cursor()
        print("\n========= SYSTEM STATISTICS =========\n")
        
        # Check tables exist
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables: {', '.join(tables)}")
        
        # Count transactions
        if 'transaction_history' in tables:
            cursor.execute("SELECT COUNT(*) FROM transaction_history")
            txn_count = cursor.fetchone()[0]
            print(f"Total Transactions: {txn_count}")
            
            # Count transactions per user (top 5)
            cursor.execute("""
                SELECT user_id, COUNT(*) as count 
                FROM transaction_history 
                GROUP BY user_id 
                ORDER BY count DESC 
                LIMIT 5
            """)
            results = cursor.fetchall()
            if results:
                print("\nTop 5 Users by Transaction Count:")
                for user_id, count in results:
                    print(f"  User {user_id}: {count} transactions")
        
        # Count detected frauds
        if 'frauds' in tables:
            cursor.execute("SELECT COUNT(*) FROM frauds")
            fraud_count = cursor.fetchone()[0]
            print(f"\nDetected Frauds: {fraud_count}")
            
            # Get fraud distribution by risk level
            cursor.execute("""
                SELECT risk_level, COUNT(*) 
                FROM frauds 
                GROUP BY risk_level 
                ORDER BY COUNT(*) DESC
            """)
            results = cursor.fetchall()
            if results:
                print("\nFrauds by Risk Level:")
                for level, count in results:
                    print(f"  {level}: {count}")
                    
            # Get fraud distribution by model used
            cursor.execute("""
                SELECT model_used, COUNT(*) 
                FROM frauds 
                GROUP BY model_used 
                ORDER BY COUNT(*) DESC
            """)
            results = cursor.fetchall()
            if results:
                print("\nFrauds by Detection Model:")
                for model, count in results:
                    print(f"  {model}: {count}")
                    
        # Count user profiles
        if 'user_profiles' in tables:
            cursor.execute("SELECT COUNT(*) FROM user_profiles WHERE usual_locations IS NOT NULL")
            profile_count = cursor.fetchone()[0]
            print(f"\nUsers with Complete Profiles: {profile_count}")
            
        # Get performance metrics
        if 'processing_stats' in tables:
            cursor.execute("SELECT * FROM processing_stats")
            stats = cursor.fetchall()
            if stats:
                print("\nPerformance Metrics:")
                for name, value, timestamp in stats:
                    if name in ['precision', 'recall', 'f1_score']:
                        print(f"  {name}: {value/100:.2f}")
                    else:
                        print(f"  {name}: {value}")
        
        print("\n======================================\n")
        
        conn.close()
        return True
    except Exception as e:
        print(f"Error retrieving stats: {e}")
        if conn:
            conn.close()
        return False

def run_system(enhanced=False):
    """Run the system with the specified mode"""
    print(f"Starting the {'enhanced' if enhanced else 'standard'} system...")
    
    # Get the project root directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Move to the project root to ensure imports work properly
    os.chdir(base_dir)
    print(f"Running from directory: {os.getcwd()}")
    
    cmd = [
        sys.executable,
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "run_enhanced_system.py")
    ]
    
    if enhanced:
        cmd.append("--enhanced")
    
    try:
        # Use os.execv to replace the current process
        os.execv(sys.executable, cmd)
    except Exception as e:
        print(f"Error starting system: {e}")
        return False

def run_frontends(frontend_only=False, with_streamlit=False):
    """Run the frontend components"""
    print("Starting the frontend components...")
    
    # Get the project root directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Move to the project root to ensure imports work properly
    os.chdir(base_dir)
    print(f"Running frontends from directory: {os.getcwd()}")
    
    cmd = [
        sys.executable,
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "run_frontends.py")
    ]
    
    # Add with-streamlit flag if requested
    if with_streamlit:
        cmd.append("--with-streamlit")
    
    try:
        # Use os.execv to replace the current process
        os.execv(sys.executable, cmd)
    except Exception as e:
        print(f"Error starting frontends: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Real-Time Anomaly Detection System Maintenance"
    )
    
    # Create a mutually exclusive group for commands
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--init-db', action='store_true', help='Initialize the database schema')
    group.add_argument('--init-profiles', action='store_true', help='Initialize user profiles from existing data')
    group.add_argument('--reset', action='store_true', help='Reset the database (delete all data)')
    group.add_argument('--stats', action='store_true', help='Show system statistics')
    group.add_argument('--run', action='store_true', help='Run the standard system')
    group.add_argument('--run-enhanced', action='store_true', help='Run the enhanced system')
    group.add_argument('--run-frontends', action='store_true', help='Run only the frontend components')
    
    # Add optional arguments that can be used with --run or --run-enhanced
    parser.add_argument('--with-frontends', action='store_true', help='Also start the frontend components')
    parser.add_argument('--with-streamlit', action='store_true', help='Also start the Streamlit dashboard (use with --with-frontends)')
    
    args = parser.parse_args()
    
    if args.init_db:
        return 0 if init_database() else 1
    elif args.init_profiles:
        return 0 if init_user_profiles() else 1
    elif args.reset:
        return 0 if reset_database() else 1
    elif args.stats:
        return 0 if show_stats() else 1
    elif args.run_frontends:
        return run_frontends(frontend_only=True, with_streamlit=args.with_streamlit)
    elif args.run:
        # If with-frontends is specified, we need to start both backend and frontend
        if args.with_frontends:
            print(f"Will start standard system and frontends{' with Streamlit' if args.with_streamlit else ''}...")
            # Fork a process for the backend
            pid = os.fork()
            if pid == 0:
                # Child process - start the backend
                run_system(enhanced=False)
            else:
                # Parent process - start the frontends and then exit
                time.sleep(3)  # Give backend time to start
                return run_frontends(with_streamlit=args.with_streamlit)
        else:
            # Just start the backend
            return run_system(enhanced=False)
    elif args.run_enhanced:
        # If with-frontends is specified, we need to start both backend and frontend
        if args.with_frontends:
            print(f"Will start enhanced system and frontends{' with Streamlit' if args.with_streamlit else ''}...")
            # Fork a process for the backend
            pid = os.fork()
            if pid == 0:
                # Child process - start the backend
                run_system(enhanced=True)
            else:
                # Parent process - start the frontends and then exit
                time.sleep(3)  # Give backend time to start
                return run_frontends(with_streamlit=args.with_streamlit)
        else:
            # Just start the backend
            return run_system(enhanced=True)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
