#!/usr/bin/env python3
import subprocess
import sys
import os
import time
import signal
import argparse

# Process handlers
processes = {}

def signal_handler(sig, frame):
    """Handle Ctrl+C and gracefully terminate all processes"""
    print("\nShutting down all components...")
    for name, process in processes.items():
        if process and process.poll() is None:
            print(f"Terminating {name}...")
            process.terminate()
    
    # Give processes a moment to terminate gracefully
    time.sleep(2)
    
    # Force kill any remaining processes
    for name, process in processes.items():
        if process and process.poll() is None:
            print(f"Forcefully killing {name}...")
            process.kill()
    
    print("All components shut down.")
    sys.exit(0)

def main():
    parser = argparse.ArgumentParser(description="Run the Real-Time Anomaly Detection System")
    parser.add_argument("--enhanced", action="store_true", help="Use the enhanced anomaly detector with user profiles")
    parser.add_argument("--init-user-profiles", action="store_true", help="Initialize user profiles from existing data")
    parser.add_argument("--init-db", action="store_true", help="Initialize database schema")
    args = parser.parse_args()
    
    # Set up signal handler for Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Get the base directory of the project
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Initialize the database if requested
    if args.init_db:
        print("Initializing database...")
        init_db_script = os.path.join(base_dir, "scripts", "init_db.py")
        if os.path.exists(init_db_script):
            result = subprocess.run([sys.executable, init_db_script], check=False)
            if result.returncode != 0:
                print("Failed to initialize database. Exiting.")
                return 1
        else:
            print(f"Could not find init_db.py at {init_db_script}")
            return 1
            
        # Also create transaction history tables
        create_history_script = os.path.join(base_dir, "scripts", "create_history_table.py")
        if os.path.exists(create_history_script):
            print("Creating transaction history tables...")
            result = subprocess.run([sys.executable, create_history_script], check=False)
            if result.returncode != 0:
                print("Failed to create transaction history tables. Exiting.")
                return 1
        else:
            print(f"Could not find create_history_table.py at {create_history_script}")
            return 1
    
    # Initialize user profiles if requested
    if args.init_user_profiles:
        print("Initializing user profiles...")
        init_profiles_script = os.path.join(base_dir, "scripts", "init_user_profiles.py")
        if os.path.exists(init_profiles_script):
            result = subprocess.run([sys.executable, init_profiles_script], check=False)
            if result.returncode != 0:
                print("Failed to initialize user profiles. Exiting.")
                return 1
        else:
            print(f"Could not find init_user_profiles.py at {init_profiles_script}")
            return 1
    
    # Start the Kafka producer
    print("Starting transaction producer...")
    producer_script = os.path.join(base_dir, "producer", "produce.py")
    if os.path.exists(producer_script):
        processes['producer'] = subprocess.Popen([sys.executable, producer_script])
    else:
        print(f"Could not find produce.py at {producer_script}")
        return 1
    
    # Wait a bit for the producer to start
    time.sleep(2)
    
    # Start the anomaly detector (enhanced or regular)
    print(f"Starting {'enhanced ' if args.enhanced else ''}anomaly detector...")
    if args.enhanced:
        detector_script = os.path.join(base_dir, "detector", "enhanced_anomaly_detector.py")
    else:
        detector_script = os.path.join(base_dir, "detector", "anomaly_detector.py")
        
    if os.path.exists(detector_script):
        processes['detector'] = subprocess.Popen([sys.executable, detector_script])
    else:
        print(f"Could not find anomaly detector at {detector_script}")
        return 1
    
    # Start the Next.js frontend
    print("Starting Next.js frontend...")
    frontend_dir = os.path.join(base_dir, "frontend")
    if os.path.exists(frontend_dir):
        # Check if npm is installed
        try:
            subprocess.run(["npm", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            
            # Check if node_modules exists, if not run npm install
            if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
                print("Installing Next.js dependencies (this may take a moment)...")
                try:
                    subprocess.run(
                        ["npm", "install"],
                        cwd=frontend_dir,
                        check=True,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.PIPE
                    )
                    print("Next.js dependencies installed successfully")
                except subprocess.CalledProcessError as e:
                    print(f"Error installing dependencies: {e.stderr.decode() if e.stderr else 'Unknown error'}")
                    print("You may need to install dependencies manually: cd frontend && npm install")
            
            # Start Next.js using npm
            processes['frontend'] = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=frontend_dir,
                env=dict(os.environ, PORT="3000")
            )
            print("Next.js frontend is running on http://localhost:3000")
        except (subprocess.SubprocessError, FileNotFoundError):
            print("Error: npm not found. Please install Node.js and npm to run the Next.js frontend.")
            return 1
    else:
        print(f"Error: Next.js frontend directory not found at {frontend_dir}")
        return 1
    
    print("\n" + "=" * 80)
    print("Real-Time Anomaly Detection System is running!")
    print("- Press Ctrl+C to shut down all components")
    print("=" * 80 + "\n")
    
    # Keep the script running and monitoring the processes
    while True:
        # Check if any process has terminated
        for name, process in list(processes.items()):
            if process.poll() is not None:
                print(f"\n{name} has terminated with exit code {process.returncode}")
                
                # Restart the process
                if name == 'producer':
                    print("Restarting producer...")
                    processes['producer'] = subprocess.Popen([sys.executable, producer_script])
                elif name == 'detector':
                    print("Restarting detector...")
                    if args.enhanced:
                        processes['detector'] = subprocess.Popen([sys.executable, detector_script])
                    else:
                        processes['detector'] = subprocess.Popen([sys.executable, detector_script])
                elif name == 'frontend':
                    print("Restarting Next.js frontend...")
                    frontend_dir = os.path.join(base_dir, "frontend")
                    processes['frontend'] = subprocess.Popen(
                        ["npm", "run", "dev"],
                        cwd=frontend_dir,
                        env=dict(os.environ, PORT="3000")
                    )
        
        # Sleep for a bit to avoid CPU overuse
        time.sleep(1)

if __name__ == "__main__":
    sys.exit(main())
