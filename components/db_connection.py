"""Database Connection Module
Contributors:
Priyanshu Patel: Led the development and integration of the end-to-end system. Integrated PostgreSQL for real-time persistence, and built the Docker-based orchestration system.
"""

import pandas as pd
import psycopg2

def get_data():
    conn = psycopg2.connect(
        dbname="anomalies",
        user="user",
        password="pass",
        host="localhost",
        port="5432"
    )
    try:
        df = pd.read_sql("SELECT * FROM frauds ORDER BY timestamp DESC", conn)
        df["datetime"] = pd.to_datetime(df["timestamp"], unit="s")
        return df
    finally:
        conn.close()
