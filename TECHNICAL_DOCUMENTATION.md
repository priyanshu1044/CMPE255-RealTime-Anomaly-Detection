# Real-Time Anomaly Detection System - Technical Documentation

## System Architecture Details

### Data Flow

1. **Transaction Generation**
   - The producer (`produce.py`) generates simulated transaction data
   - Each transaction contains user information, transaction details, merchant data, and device info
   - Transactions are marked as anomalous (1 in 20) based on predefined rules
   - Data is sent to the Kafka topic "transactions"

2. **Anomaly Detection**
   - The detector consumes transactions from Kafka
   - Features are extracted and normalized from the transaction data
   - The Isolation Forest algorithm scores each transaction
   - Detected anomalies are stored in the PostgreSQL database
   - Results are made available to the frontend

3. **User Profile Management**
   - The enhanced detector maintains user profiles
   - Profiles contain typical transaction patterns for each user
   - New transactions are compared against user profiles
   - Profiles are updated based on legitimate transaction history

4. **Visualization**
   - The Next.js frontend fetches data from the PostgreSQL database
   - Transactions and anomalies are displayed in real-time
   - Interactive dashboards show transaction patterns and anomaly statistics

## Component Implementation Details

### Transaction Producer

#### User Profile Simulation

The producer creates simulated user profiles with the following attributes:

```python
user_profiles[user_id] = {
    "usual_locations": ["US", "IN", "UK", ...],  # Countries where user typically transacts
    "usual_merchants": ["Retail", "Restaurant", ...],  # Typical merchant categories
    "typical_min_amount": 50.00,  # Minimum typical transaction amount
    "typical_max_amount": 500.00,  # Maximum typical transaction amount
    "typical_payment_methods": ["Credit Card", "Digital Wallet"],  # Usual payment methods
    "typical_transaction_times": [8, 12, 18, 21]  # Hours when user typically transacts
}
```

#### Anomaly Simulation

Anomalous transactions are generated with one or more of these characteristics:
- Unusual location (different from user's usual countries)
- Unusually high amount (above typical maximum)
- Unusual merchant category
- Transaction at an unusual time
- Unusual payment method

### Anomaly Detector

#### Feature Engineering

The detector extracts and processes these features from transactions:
- Transaction amount (normalized)
- Time of day (converted to cyclical features)
- Location (converted to binary features)
- Merchant category (converted to categorical features)
- Payment method (converted to categorical features)

#### Machine Learning Model

The system uses the Isolation Forest algorithm from the PyOD library:

```python
model = IForest(
    n_estimators=100,  # Number of isolation trees
    max_samples='auto',  # Samples used for training each tree
    contamination=0.05,  # Expected proportion of anomalies
    random_state=42  # For reproducibility
)
```

#### Database Schema

The anomalies are stored in a table with this structure:

```sql
CREATE TABLE IF NOT EXISTS anomalies (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE,
    user_id INTEGER,
    amount NUMERIC(10, 2),
    timestamp TIMESTAMP,
    location VARCHAR(50),
    merchant_category VARCHAR(100),
    payment_method VARCHAR(100),
    anomaly_score NUMERIC(10, 6),
    is_anomaly BOOLEAN,
    detection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Enhanced Anomaly Detector

#### User Profile Management

The enhanced detector uses the `UserProfileManager` class to:
- Load existing user profiles from the database
- Update profiles based on new transactions
- Calculate personalized anomaly thresholds

#### Advanced Detection Features

The enhanced detector adds these capabilities:
- Per-user anomaly thresholds based on historical behavior
- Time-based pattern recognition (detecting unusual transaction times)
- Merchant category analysis (unusual spending categories)
- Location-based risk assessment

### Next.js Frontend

#### Key Components

- Real-time dashboard with transaction statistics
- Transaction list with filtering and sorting
- Anomaly visualization with severity indicators
- User profile viewer

#### API Endpoints

The frontend communicates with the backend through these endpoints:
- `/api/transactions` - Get recent transactions
- `/api/anomalies` - Get detected anomalies
- `/api/stats` - Get system statistics
- `/api/users/{id}` - Get user profile information

## System Management

### Maintenance Script

The `maintain.py` script provides these functions:

```python
def init_database():  # Initialize database schema
def init_user_profiles():  # Create user profiles from transaction history
def run_system(enhanced=False):  # Run the basic or enhanced system
def run_frontends():  # Run only the frontend components
def check_system_status():  # Check if all components are running
def stop_system():  # Stop all running components
```

### Process Management

All scripts handle graceful shutdown with signal handlers:

```python
def signal_handler(sig, frame):
    # Terminate all child processes
    # Close database connections
    # Shut down Kafka consumers/producers
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)
```

## Performance Considerations

### Scalability

- Kafka enables horizontal scaling of producers and consumers
- Database connections use connection pooling for efficiency
- The anomaly detection algorithm is optimized for real-time processing

### Fault Tolerance

- Components automatically reconnect to the database if the connection is lost
- Failed processes are automatically restarted
- Kafka provides message persistence in case of consumer failures

## Development and Extension

### Adding New Features

1. **New Anomaly Detection Methods**
   - Implement a new detector class that follows the same interface
   - Add the new detector to the enhanced_anomaly_detector.py file

2. **Additional Data Sources**
   - Create a new producer for the additional data
   - Configure it to send data to a new Kafka topic
   - Extend the detector to consume from the new topic

3. **Frontend Enhancements**
   - Add new components to the Next.js frontend
   - Extend the API endpoints to provide the required data
   - Update the UI to display the new information

### Testing

To test the system:

1. Run the producer to generate test data
2. Verify that transactions appear in Kafka
3. Check that the detector processes transactions correctly
4. Confirm that anomalies are stored in the database
5. Validate that the frontend displays the correct information

## Deployment Considerations

### Production Environment

For production deployment:

1. Configure secure authentication for Kafka and PostgreSQL
2. Set up monitoring and alerting for all components
3. Implement proper logging with log rotation
4. Consider containerization with Docker and orchestration with Kubernetes
5. Set up backup and recovery procedures for the database

### Security Recommendations

1. Encrypt sensitive data in the database
2. Implement proper authentication for the frontend
3. Use TLS for all communication between components
4. Regularly update dependencies to address security vulnerabilities
5. Implement rate limiting to prevent abuse