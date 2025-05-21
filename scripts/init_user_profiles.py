import sys
import os
import pandas as pd
import json
import time

# Add the parent directory to the path so we can import components
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from components.user_profile_manager import UserProfileManager

def main():
    """Initialize user profiles from existing transaction history"""
    print("Initializing user profiles from transaction history...")
    
    try:
        # Initialize the user profile manager
        user_manager = UserProfileManager()
        
        # Get all users with at least 20 transactions
        user_manager.cursor.execute("""
            SELECT DISTINCT user_id FROM transaction_history
            GROUP BY user_id
            HAVING COUNT(*) >= 20
        """)
        
        users = [row[0] for row in user_manager.cursor.fetchall()]
        
        if not users:
            print("No users found with sufficient transaction history.")
            print("Run the system for a while to generate some history.")
            return
        
        print(f"Found {len(users)} users with sufficient transaction history.")
        
        for i, user_id in enumerate(users):
            print(f"Processing user {user_id} ({i+1}/{len(users)})...")
            
            # Update the user's profile
            updated = user_manager.update_user_profile(user_id)
            if updated:
                print(f"  Updated profile for user {user_id}")
            else:
                print(f"  Failed to update profile for user {user_id}")
                continue
                
            # Train a model for the user
            trained = user_manager.train_user_model(user_id)
            if trained:
                print(f"  Trained model for user {user_id}")
            else:
                print(f"  Failed to train model for user {user_id}")
        
        print("User profile initialization complete.")
        
    except Exception as e:
        print(f"Error initializing user profiles: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
