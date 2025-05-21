import { Pool } from 'pg';
import { NextRequest, NextResponse } from 'next/server';

const pool = new Pool({
  user: process.env.DB_USER || 'user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'anomalies',
  password: process.env.DB_PASSWORD || 'pass',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      const processingStatsResult = await client.query(
        "SELECT count_value, last_updated_timestamp FROM processing_stats WHERE counter_name = 'total_transactions_processed'"
      );

      const anomaliesResult = await client.query(
        "SELECT COUNT(*) AS total_anomalies FROM frauds"
      );

      let totalTransactions = 0;
      let lastUpdatedTimestamp = null;
      let totalAnomalies = 0;

      if (processingStatsResult.rows.length > 0) {
        const statsData = processingStatsResult.rows[0];
        totalTransactions = parseInt(statsData.count_value, 10);
        lastUpdatedTimestamp = statsData.last_updated_timestamp; 
      }

      if (anomaliesResult.rows.length > 0) {
        totalAnomalies = parseInt(anomaliesResult.rows[0].total_anomalies, 10);
      }

      return NextResponse.json({
        totalTransactions,
        lastUpdatedTimestamp,
        totalAnomalies,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching metrics from PostgreSQL:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
