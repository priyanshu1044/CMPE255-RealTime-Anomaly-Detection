# Real-Time Anomaly Detection System - User Guide

## Introduction

The Real-Time Anomaly Detection System is designed to identify unusual patterns in financial transactions that may indicate fraudulent activity. This guide will help you install, configure, and use the system effectively.

## Getting Started

### System Requirements

- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Disk Space**: At least 2GB free space
- **Software Prerequisites**:
  - Python 3.8 or higher
  - Node.js 14 or higher
  - PostgreSQL 12 or higher
  - Apache Kafka

### Installation

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd RealTime-Anomaly-Detection
   ```

2. **Install Python Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**

   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Set Up the Database**

   Ensure PostgreSQL is running, then initialize the database:

   ```bash
   python scripts/maintain.py --init-db
   ```

## Using the System

### Starting the System

The easiest way to run the system is using the maintenance script:

```bash
python scripts/maintain.py --run-enhanced --with-frontends
```

This command will:
- Start the transaction producer
- Start the enhanced anomaly detector
- Launch the Next.js frontend
- Open your browser to the dashboard

### Dashboard Overview

Once the system is running, the Next.js frontend will be available at http://localhost:3000. The dashboard includes:

1. **Transaction Overview**
   - Real-time transaction count
   - Transaction volume over time
   - Distribution by merchant category

2. **Anomaly Detection**
   - List of detected anomalies
   - Anomaly score visualization
   - Filtering options by severity

3. **User Profiles**
   - User transaction patterns
   - Typical behavior visualization
   - Risk assessment

### Monitoring Transactions

1. **Viewing All Transactions**
   - Navigate to the "Transactions" tab
   - View the list of recent transactions
   - Use filters to narrow down by date, amount, or merchant

2. **Examining Anomalies**
   - Go to the "Anomalies" tab
   - Review flagged transactions
   - Sort by anomaly score to prioritize investigation

3. **User Analysis**
   - Select a specific user from the dropdown
   - View their transaction history
   - Analyze their typical behavior patterns

### System Configuration

#### Running Different Components

You can run specific parts of the system as needed:

1. **Run Only the Frontend**

   ```bash
   python scripts/maintain.py --run-frontends
   ```

2. **Run the Basic System (without user profiles)**

   ```bash
   python scripts/maintain.py --run-system
   ```

3. **Initialize User Profiles**

   After collecting some transaction data:

   ```bash
   python scripts/maintain.py --init-user-profiles
   ```

#### Command-Line Options

The maintenance script supports these options:

- `--init-db`: Initialize the database schema
- `--init-user-profiles`: Create user profiles from transaction history
- `--run-system`: Run the basic anomaly detection system
- `--run-enhanced`: Run the enhanced system with user profiles
- `--with-frontends`: Start the frontend components
- `--run-frontends`: Run only the frontend components
- `--no-browser`: Don't automatically open browser windows

## Interpreting Results

### Understanding Anomaly Scores

The system assigns an anomaly score to each transaction:

- **0.0 - 0.5**: Normal transaction
- **0.5 - 0.7**: Slightly unusual
- **0.7 - 0.9**: Suspicious transaction
- **0.9 - 1.0**: Highly anomalous

### Anomaly Factors

When a transaction is flagged as anomalous, the system indicates which factors contributed:

- **Amount**: Unusually high or low transaction amount
- **Location**: Transaction from an unusual location
- **Time**: Transaction at an unusual time of day
- **Merchant**: Unusual merchant category for this user
- **Frequency**: Unusual number of transactions in a short period

## Troubleshooting

### Common Issues

1. **System Won't Start**
   - Check that Kafka is running
   - Verify PostgreSQL is accessible
   - Ensure all dependencies are installed

2. **No Transactions Appearing**
   - Check Kafka connection settings
   - Verify the producer is running
   - Check for errors in the producer logs

3. **Frontend Not Loading**
   - Ensure Node.js is installed
   - Check that port 3000 is available
   - Verify npm dependencies are installed

### Restarting Components

If a component crashes:

1. Press Ctrl+C to stop the running script
2. Run the maintenance script again with the same options

### Checking Logs

All components output logs to the console. Look for error messages that might indicate the source of problems.

## Advanced Usage

### Manual Component Control

For more control, you can start each component separately:

1. **Start the Producer**

   ```bash
   python producer/produce.py
   ```

2. **Start the Detector**

   ```bash
   python detector/enhanced_anomaly_detector.py
   ```

3. **Start the Frontend**

   ```bash
   cd frontend
   npm run dev
   ```

### Stopping the System

To stop all components:

1. Press Ctrl+C in the terminal where the system is running
2. The system will gracefully shut down all components

## Getting Help

If you encounter issues not covered in this guide:

1. Check the technical documentation for more detailed information
2. Examine the console logs for error messages
3. Refer to the README.md file for additional resources