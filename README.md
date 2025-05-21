# Real-Time Anomaly Detection in Transactions

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

##  Setup Instructions (for macOS / Windows with WSL)

### 1. Clone the repository
```bash
git clone https://github.com/Kruti0910/RealTime-Anomaly-Detection.git
cd RealTime-Anomaly-Detection
```

### 2. Install Python dependencies
```bash
pip3 install -r requirements.txt
```

### 3. Start Docker services
Ensure Docker is installed and running.
```bash
docker-compose up -d
```
This will start Redpanda (Kafka) and PostgreSQL.

### 4. Create Kafka topic
Install Redpanda CLI (`rpk`) if not already installed:
```bash
curl -LO https://github.com/redpanda-data/redpanda/releases/latest/download/rpk-linux-amd64.zip
unzip rpk-linux-amd64.zip -d ~/.local/bin
chmod +x ~/.local/bin/rpk
```
Then create the topic:
```bash
rpk topic create transactions --brokers localhost:9092
```

---

##  Running the Application

### Option 1: Using the Maintenance Script (Recommended)

The maintenance script provides a unified interface for managing the system:

#### Standard Mode (Batch-based detection)
```bash
python scripts/maintain.py --run
```

#### Enhanced Mode (User-specific models)
```bash
# First, initialize user profiles (only needed once)
python scripts/maintain.py --init-profiles

# Then run the enhanced system
python scripts/maintain.py --run-enhanced
```

#### Run with Frontends
To run the system with the Next.js frontend:
```bash
python scripts/maintain.py --run-enhanced --with-frontends
```

Or to run just the frontends:
```bash
python scripts/maintain.py --run-frontends
```

### Option 2: Manual Component Startup

#### A. Start the Kafka Producer (generates transaction data)
```bash
python producer/produce.py
```

#### B. Start the Real-Time Anomaly Detector
Standard detector:
```bash
python detector/anomaly_detector.py
```

Or enhanced detector with user-specific models:
```bash
python detector/enhanced_anomaly_detector.py
```


#### D. Launch the Next.js Frontend (optional)
```bash
cd frontend
npm install  # First time only
npm run dev
```

Then open your browser at:
- Next.js: [http://localhost:3000](http://localhost:3000)

---

##  Verifying PostgreSQL Data
You can check the `frauds` table manually:
```bash
docker exec -it realtime-anomaly-detection-postgres-1 psql -U user -d anomalies
```
Then inside the DB:
```sql
SELECT * FROM frauds;
```

---

##  Python Dependencies (requirements.txt)
```
kafka-python
pyod
pandas
numpy
psycopg2-binary
altair
scikit-learn
pickle-mixin
```

---

##  Expected Output
- Transactions being printed in terminal via producer
- Detected anomalies logged via detector
- Real-time dashboard showing anomaly table and bar chart of amounts by location

---

##  System Maintenance

The `maintain.py` script provides utilities for system maintenance:

```bash
# Show system statistics and performance metrics
python scripts/maintain.py --stats

# Reset the database (WARNING: Deletes all data)
python scripts/maintain.py --reset

# Initialize or re-initialize the database schema
python scripts/maintain.py --init-db

# Initialize user profiles from transaction history
python scripts/maintain.py --init-profiles
```

## Enhanced vs Standard System

The enhanced anomaly detection system offers several advantages:

1. **User-specific pattern detection** - Models understand individual user behavior patterns
2. **Historical context** - Compares against entire transaction histories, not just small batches
3. **Reduced false positives** - More accurate anomaly scoring with personalized thresholds
4. **Continuous learning** - Models improve over time as transaction history grows
5. **Advanced analytics** - User profile visualizations and model performance metrics

##  Notes
- Works on macOS and Windows (with WSL)
- Tested with Python 3.10+
- Make sure Docker Desktop is running
- The Next.js frontend requires Node.js 18+ to be installed

