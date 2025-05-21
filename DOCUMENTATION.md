# Real-Time Anomaly Detection System Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [System Architecture](#system-architecture)
3. [Components](#components)
   - [Transaction Producer](#transaction-producer)
   - [Anomaly Detector](#anomaly-detector)
   - [Enhanced Anomaly Detector](#enhanced-anomaly-detector)
   - [Next.js Frontend](#nextjs-frontend)
4. [Installation](#installation)
   - [Prerequisites](#prerequisites)
   - [Database Setup](#database-setup)
   - [Dependencies Installation](#dependencies-installation)
5. [Running the System](#running-the-system)
   - [Using the Maintenance Script (Recommended)](#using-the-maintenance-script-recommended)
   - [Manual Component Startup](#manual-component-startup)
6. [Configuration Options](#configuration-options)
7. [Troubleshooting](#troubleshooting)

## System Overview

The Real-Time Anomaly Detection System is designed to detect anomalies in financial transactions in real-time. It uses a combination of machine learning algorithms and user profile analysis to identify potentially fraudulent transactions. The system consists of several components that work together to generate, process, analyze, and visualize transaction data.

## System Architecture

The system follows a microservices architecture with the following main components:

1. **Transaction Producer**: Generates simulated transaction data and sends it to a Kafka topic.
2. **Anomaly Detector**: Consumes transaction data from Kafka, analyzes it for anomalies, and stores results in a PostgreSQL database.
3. **Enhanced Anomaly Detector**: An improved version of the anomaly detector that uses user profiles for more accurate detection.
4. **Next.js Frontend**: Provides a web interface to visualize transaction data and detected anomalies.

The components communicate through:
- **Kafka**: For real-time data streaming between the producer and detectors
- **PostgreSQL**: For storing transaction data, anomaly detection results, and user profiles

## Components

### Transaction Producer

The transaction producer (`producer/produce.py`) generates simulated transaction data with the following features:

- Creates transactions for 100 simulated users
- Each user has a profile with typical transaction patterns
- Generates both normal and anomalous transactions (1 in 20 transactions is anomalous)
- Sends transactions to a Kafka topic named "transactions"

Transaction data includes:
- Transaction ID, user ID, amount, currency
- Location, timestamp, transaction type
- Merchant information (ID, name, category)
- Payment method and device information

### Anomaly Detector

The anomaly detector (`detector/anomaly_detector.py`) processes transactions and identifies potential anomalies using:

- **Isolation Forest Algorithm**: A machine learning model for anomaly detection
- Feature extraction from transaction data
- Real-time scoring of transactions
- Storage of detection results in PostgreSQL

### Enhanced Anomaly Detector

The enhanced anomaly detector (`detector/enhanced_anomaly_detector.py`) extends the basic detector with:

- User profile-based detection for improved accuracy
- Historical transaction analysis
- Adaptive thresholds based on user behavior
- More sophisticated feature engineering

### Next.js Frontend

The Next.js frontend provides a modern web interface for:

- Visualizing transaction data in real-time
- Displaying detected anomalies
- Filtering and searching transactions
- Viewing user profiles and transaction patterns

## Installation

### Prerequisites

- Python 3.8 or higher
- Node.js and npm
- PostgreSQL database
- Apache Kafka

### Database Setup

1. Ensure PostgreSQL is running and accessible
2. Create a database named "anomalies"
3. Configure database credentials in the system components

### Dependencies Installation

1. Clone the repository
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Install Next.js frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

## Running the System

### Using the Maintenance Script (Recommended)

The maintenance script (`scripts/maintain.py`) provides a unified interface for managing the system:

#### Initialize the System

```bash
# Initialize the database schema
python scripts/maintain.py --init-db

# Run the system for a while to collect data, then initialize user profiles
python scripts/maintain.py --run-system
# After collecting some data
python scripts/maintain.py --init-user-profiles
```

#### Run the Complete System

```bash
# Run the basic system
python scripts/maintain.py --run-system

# Run the enhanced system with user profiles
python scripts/maintain.py --run-enhanced

# Run the system with the Next.js frontend
python scripts/maintain.py --run-enhanced --with-frontends
```

#### Run Only the Frontend

```bash
python scripts/maintain.py --run-frontends
```

Use the `--no-browser` option to prevent automatically opening browser windows:

```bash
python scripts/maintain.py --run-frontends --no-browser
```

### Manual Component Startup

Alternatively, you can start each component manually:

#### 1. Initialize the Database

```bash
python scripts/init_db.py
python scripts/create_history_table.py
```

#### 2. Start the Transaction Producer

```bash
python producer/produce.py
```

#### 3. Start the Anomaly Detector

```bash
# Basic detector
python detector/anomaly_detector.py

# OR Enhanced detector
python detector/enhanced_anomaly_detector.py
```

#### 4. Start the Next.js Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

Then open your browser at http://localhost:3000

## Configuration Options

### Run Enhanced System Script

The `run_enhanced_system.py` script accepts the following options:

- `--enhanced`: Use the enhanced anomaly detector with user profiles
- `--init-user-profiles`: Initialize user profiles from existing data
- `--init-db`: Initialize database schema

### Run Frontends Script

The `run_frontends.py` script accepts the following options:

- `--no-browser`: Don't automatically open browser windows

## Troubleshooting

### Common Issues

1. **Kafka Connection Issues**
   - Ensure Kafka is running on localhost:9092
   - Check Kafka logs for errors

2. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check database credentials in the code
   - Ensure the "anomalies" database exists

3. **Frontend Not Starting**
   - Ensure Node.js and npm are installed
   - Check for errors in the npm installation process
   - Verify port 3000 is not in use by another application

### Logs and Debugging

- Each component outputs logs to the console
- Check for error messages in the component outputs
- The maintenance script provides status information for all components

### Restarting Components

If a component crashes or behaves unexpectedly:

1. Press Ctrl+C to stop the running script
2. Restart the component or the entire system
3. Check logs for error messages

For persistent issues, try initializing the database again or checking the Kafka and PostgreSQL services.