# Real-Time Anomaly Detection in Transactions

This project implements a **real-time anomaly detection system** for financial transactions using streaming data, machine learning, and data visualization. It detects fraudulent transactions using PyOD and Isolation Forest, processes data in real-time using Redpanda (Kafka-compatible), and stores anomalies in a PostgreSQL database, which are then displayed through a live dashboard built with Next.js.

The system features both a standard batch-based anomaly detection approach and an enhanced mode with user-specific models that learn from individual transaction histories.

---

## Tech Stack
- **Producer:** Python + `kafka-python` (Redpanda-compatible)
- **Streaming Platform:** [Redpanda](https://redpanda.com/) (Kafka-compatible)
- **Anomaly Detection:** Python, [PyOD](https://github.com/yzhao062/pyod), Isolation Forest, User-Specific Models
- **Storage:** PostgreSQL (via Docker)
- **Dashboard:** 
  - Next.js (modern UI with React components for data exploration and monitoring)
- **Maintenance:** Centralized system management scripts

---

## 📁 Project Structure

```
RealTime-Anomaly-Detection/
├── producer/                 # Kafka producer script
│   └── produce.py
├── detector/                 # Anomaly detection scripts
│   ├── anomaly_detector.py   # Standard batch-based detector
│   └── enhanced_anomaly_detector.py  # User-specific model detector
├── components/               # Shared components
│   ├── filters.py            # UI filters for dashboard
│   ├── db_connection.py      # Database utilities
│   └── user_profile_manager.py  # User profile management
├── models/                   # Saved user-specific models
├── scripts/                  # Utility scripts
│   ├── maintain.py           # System maintenance script
│   ├── init_user_profiles.py # Profile initialization
│   └── run_frontends.py      # Frontend launcher
├── frontend/                 # Next.js frontend application
├── docker-compose.yml        # Redpanda and PostgreSQL Docker setup
├── requirements.txt          # Python dependencies
└── README.md                 # Project documentation
```

---

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

