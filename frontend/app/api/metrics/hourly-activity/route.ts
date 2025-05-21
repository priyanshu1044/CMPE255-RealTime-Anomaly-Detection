import { Pool } from "pg";
import { NextRequest, NextResponse } from "next/server";

const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "anomalies",
  password: process.env.DB_PASSWORD || "pass",
  port: parseInt(process.env.DB_PORT || "5432", 10),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "24h";

    let intervalSql: string;
    switch (timeRange) {
      case "7d":
        intervalSql = "INTERVAL '7 days'";
        break;
      case "30d":
        intervalSql = "INTERVAL '30 days'";
        break;
      case "1h":
        intervalSql = "INTERVAL '1 hour'";
        break;
      case "6h":
        intervalSql = "INTERVAL '6 hours'";
        break;
      case "12h":
        intervalSql = "INTERVAL '12 hours'";
        break;
      case "24h":
      default:
        intervalSql = "INTERVAL '24 hours'";
        break;
    }

    const client = await pool.connect();
    try {
      console.log(
        `Fetching anomalies for time range: ${timeRange}, current server time: ${new Date().toISOString()}`
      );

      const hourlyAnomaliesResult = await client.query(`
        SELECT 
          EXTRACT(HOUR FROM to_timestamp(timestamp)) AS hour,
          COUNT(*) AS anomaly_count
        FROM frauds
        WHERE 
          timestamp IS NOT NULL
          AND timestamp >= EXTRACT(EPOCH FROM NOW() - ${intervalSql})
        GROUP BY hour
        ORDER BY hour ASC
      `);

      console.log(
        "Hourly anomalies result rows:",
        hourlyAnomaliesResult.rows.length
      );

      const hours = Array.from({ length: 24 }, (_, i) => i);
      const anomalyData = hours.map((hour) => ({
        hour: hour.toString().padStart(2, "0") + ":00",
        anomalies: 0,
      }));

      hourlyAnomaliesResult.rows.forEach((row) => {
        if (row.hour !== null && row.hour !== undefined) {
          const hourIndex = parseInt(row.hour, 10);

          if (!isNaN(hourIndex) && hourIndex >= 0 && hourIndex < 24) {
            anomalyData[hourIndex].anomalies = parseInt(row.anomaly_count, 10);
          } else {
            console.warn(
              `[hourly-activity] Invalid or out-of-range hour index encountered: ${hourIndex} from row.hour: ${row.hour}`
            );
          }
        } else {
          console.warn(
            `[hourly-activity] Null or undefined hour value encountered for a row. Skipping.`
          );
        }
      });

      return NextResponse.json({
        hourlyData: anomalyData,
        timeRange,
        queriedAt: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(
      "[API Error - /api/metrics/hourly-activity] Error fetching hourly anomaly data from PostgreSQL:",
      error
    );
    let errorMessage = "Failed to fetch hourly anomaly data from server.";
    if (error instanceof Error) {
      errorMessage = `Server error: ${error.message}`;
    }
    return NextResponse.json(
      {
        error: "Failed to fetch hourly activity data.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
