import os
import sys
import subprocess
import time
import signal
import psycopg2

def check_db_connection():
    """Check if the database is accessible"""
    try:
        conn = psycopg2.connect(
            dbname="anomalies",
            user="user",
            password="pass",
            host="localhost",
            port="5432",
            connect_timeout=5
        )
        conn.close()
        return True
    except:
        return False

def run_script(script_path):
    """Run a Python script and return the process"""
    return subprocess.Popen(
        [sys.executable, script_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        bufsize=1
    )

def main():
    """Main function to run the system"""
    print("Starting RealTime Anomaly Detection System...")
    
    # Get base directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Check database connection
    print("Checking database connection...")
    if not check_db_connection():
        print("Error: Cannot connect to PostgreSQL database.")
        print("Make sure PostgreSQL is running with the following configuration:")
        print("  - Database: anomalies")
        print("  - User: user")
        print("  - Password: pass")
        print("  - Host: localhost")
        print("  - Port: 5432")
        return 1
    
    # Initialize database
    print("Initializing database schema...")
    db_init_result = subprocess.run([sys.executable, os.path.join(base_dir, "scripts", "init_db.py")])
    if db_init_result.returncode != 0:
        print("Error: Failed to initialize database schema.")
        return 1
    
    # Start producer and detector processes
    print("Starting transaction producer...")
    producer_process = run_script(os.path.join(base_dir, "producer", "produce.py"))
    
    print("Starting anomaly detector...")
    detector_process = run_script(os.path.join(base_dir, "detector", "anomaly_detector.py"))
    
    # Monitor processes
    processes = {
        'producer': producer_process,
        'detector': detector_process
    }
    
    def signal_handler(sig, frame):
        print("\nShutting down gracefully...")
        for name, process in processes.items():
            print(f"Terminating {name} process...")
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print(f"Force killing {name} process...")
                process.kill()
        print("All processes terminated.")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("System running. Press Ctrl+C to stop.")
    
    # Print output from processes
    while True:
        for name, process in processes.items():
            line = process.stdout.readline()
            if line:
                print(f"[{name}] {line.strip()}")
            
            # Check if process has terminated
            if process.poll() is not None:
                print(f"Error: {name} process has terminated unexpectedly.")
                remaining_output = process.stdout.read()
                if remaining_output:
                    print(f"[{name}] {remaining_output.strip()}")
                
                # Terminate other processes
                signal_handler(None, None)
                return 1
        
        time.sleep(0.1)

if __name__ == "__main__":
    sys.exit(main())
