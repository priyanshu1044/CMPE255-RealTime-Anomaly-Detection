import { NextRequest, NextResponse } from "next/server";
import { executeQuery, checkDatabaseConnection } from "@/lib/db";
import { getMockHistogramData } from "@/lib/mock-analytics";

type HistogramRow = {
  bucket: string;
  count: string;
};

export async function GET(request: NextRequest) {
  try {
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.warn("Database connection failed. Using mock histogram data.");
      const mockData = getMockHistogramData();
      console.log(
        "[API] Using MOCK histogram data:",
        `${mockData.labels.length} buckets, ${mockData.data.reduce(
          (a, b) => a + b,
          0
        )} data points`
      );
      return NextResponse.json(mockData);
    }
    console.log("[API] Using REAL database for histogram data");

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const scoreThreshold = searchParams.get("scoreThreshold")
      ? parseFloat(searchParams.get("scoreThreshold")!)
      : 0;
    const userId = searchParams.get("userId");

    const whereConditions = ["timestamp IS NOT NULL"];
    const queryParams: any[] = [];

    if (dateParam) {
      const date = new Date(dateParam);

      const formattedDate = date.toISOString().split("T")[0];
      whereConditions.push("DATE(to_timestamp(timestamp)) = $1::date");
      queryParams.push(formattedDate);
    }

    if (scoreThreshold > 0) {
      const amountThreshold = scoreThreshold * 5000;
      whereConditions.push("amount >= $" + (queryParams.length + 1));
      queryParams.push(amountThreshold);
    }

    if (userId) {
      whereConditions.push("user_id::text = $" + (queryParams.length + 1));
      queryParams.push(userId);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    console.log(
      `Fetching anomaly scores with filters: date=${dateParam}, scoreThreshold=${scoreThreshold}, userId=${userId}`
    );
    console.log("Query params:", queryParams);

    const histogramQuery = `
      SELECT 
        width_bucket(amount, 0, 5000, 10) as bucket,
        COUNT(*)::text as count
      FROM frauds
      ${whereClause}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const histogramResult = await executeQuery<HistogramRow>(
      histogramQuery,
      queryParams
    );
    console.log("Histogram query result rows:", histogramResult.length);

    const histogram = Array(10).fill(0);

    histogramResult.forEach((row: HistogramRow) => {
      const bucketIndex = parseInt(row.bucket, 10) - 1;
      if (bucketIndex >= 0 && bucketIndex < 10) {
        histogram[bucketIndex] = parseInt(row.count, 10);
      }
    });

    const labels = [];
    for (let i = 0; i < 10; i++) {
      const start = (i * 500).toFixed(0);
      const end = ((i + 1) * 500).toFixed(0);
      labels.push(`$${start}-$${end}`);
    }

    return NextResponse.json({
      labels,
      data: histogram,
      queriedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[API Error - /api/metrics/score-distribution] Error fetching score distribution data:",
      error
    );
    let errorMessage = "Failed to fetch score distribution data from server.";

    if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
