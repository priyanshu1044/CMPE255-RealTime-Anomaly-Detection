#!/usr/bin/env python3
"""
Script to run the Next.js frontend for the Real-Time Anomaly Detection System.
Use this to start the frontend component when running the system.
"""

import subprocess
import os
import sys
import time
import signal
import argparse
import webbrowser

# Process handlers
processes = {}

def signal_handler(sig, frame):
    """Handle Ctrl+C and gracefully terminate all processes"""
    print("\nShutting down all frontend components...")
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
    
    print("All frontend components shut down.")
    sys.exit(0)

def main():
    parser = argparse.ArgumentParser(description="Run the Real-Time Anomaly Detection frontend")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser windows")
    args = parser.parse_args()
    
    # Set up signal handler for Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Get the base directory of the project (parent of the scripts directory)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Start Next.js frontend
    frontend_dir = os.path.join(base_dir, "frontend")
    if os.path.exists(frontend_dir):
        print("Starting Next.js frontend...")
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
                    # Continue anyway to try running Next.js
                
            # Start Next.js using npm
            processes['nextjs'] = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=frontend_dir,
                env=dict(os.environ, PORT="3000")
            )
            print("Next.js frontend is running on http://localhost:3000")
            
            if not args.no_browser:
                time.sleep(5)  # Give time to start up
                webbrowser.open("http://localhost:3000")
        except (subprocess.SubprocessError, FileNotFoundError):
            print("Error: npm not found. Please install Node.js and npm to run the Next.js frontend.")
    else:
        print(f"Error: Next.js frontend directory not found at {frontend_dir}")
    
    print("\n" + "=" * 80)
    print("Real-Time Anomaly Detection Frontend is running!")
    print("- Press Ctrl+C to shut down the frontend")
    print("=" * 80 + "\n")
    
    # Keep the script running and monitoring the processes
    try:
        while True:
            # Check if any process has terminated
            for name, process in list(processes.items()):
                if process.poll() is not None:
                    print(f"\n{name} has terminated with exit code {process.returncode}")
                    
                    # Restart the process
                    if name == 'nextjs':
                        print("Restarting Next.js frontend...")
                        frontend_dir = os.path.join(base_dir, "frontend")
                        processes['nextjs'] = subprocess.Popen(
                            ["npm", "run", "dev"],
                            cwd=frontend_dir,
                            env=dict(os.environ, PORT="3000")
                        )
            
            # Sleep for a bit to avoid CPU overuse
            time.sleep(1)
    except KeyboardInterrupt:
        # Handle Ctrl+C
        signal_handler(signal.SIGINT, None)

if __name__ == "__main__":
    sys.exit(main())
