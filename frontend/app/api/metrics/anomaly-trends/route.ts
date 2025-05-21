import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, checkDatabaseConnection } from '@/lib/db';
import { getMockTrendData } from '@/lib/mock-analytics';

type TrendRow = {
  day: string;
  count: string;
  avg_score: string;
};

export async function GET(request: NextRequest) {
  try {
    // Check if the database is available
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.warn('Database connection failed. Using mock trend data.');
      const mockData = getMockTrendData();
      console.log('[API] Using MOCK trend data:', 
        `${mockData.labels.length} days, ${mockData.datasets[1].data.reduce((a, b) => a + b, 0)} anomalies`);
      return NextResponse.json(mockData);
    }
    console.log('[API] Using REAL database for trend data');

    // Extract filter parameters from the URL query string
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const scoreThreshold = searchParams.get('scoreThreshold') ? parseFloat(searchParams.get('scoreThreshold')!) : 0;
    const userId = searchParams.get('userId');

    // Build the WHERE clause based on the filters
    const whereConditions = ['timestamp IS NOT NULL'];
    const queryParams: any[] = [];
    
    if (dateParam) {
      const date = new Date(dateParam);
      // Format date as 'YYYY-MM-DD' string for consistency
      const formattedDate = date.toISOString().split('T')[0];
      whereConditions.push('DATE(to_timestamp(timestamp)) = $1::date');
      queryParams.push(formattedDate);
    }
    
    if (scoreThreshold > 0) {
      // Convert the 0-1 score threshold to a relative amount threshold (0-5000 range)
      const amountThreshold = scoreThreshold * 5000;
      whereConditions.push('amount >= $' + (queryParams.length + 1));
      queryParams.push(amountThreshold);
    }
    
    if (userId) {
      // Explicitly cast the user_id comparison to text to avoid type conversion errors
      whereConditions.push('user_id::text = $' + (queryParams.length + 1));
      queryParams.push(userId);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    console.log(`Fetching anomaly trends with filters: date=${dateParam}, scoreThreshold=${scoreThreshold}, userId=${userId}`);
    
    const trendQuery = `
      SELECT 
        DATE(to_timestamp(timestamp)) as day,
        COUNT(*) as count,
        LEAST(AVG(amount)/5000, 1.0) as avg_score
      FROM frauds
      ${whereClause}
      AND timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '10 days')
      GROUP BY day
      ORDER BY day ASC
      LIMIT 10
    `;
    
    const trendsResult = await executeQuery<TrendRow>(trendQuery, queryParams);
    console.log('Trends query result rows:', trendsResult.length);
    
    // Format the data for the chart
    const labels: string[] = [];
    const counts: number[] = [];
    const scores: number[] = [];
    
    // Generate dates for the last 10 days to ensure we have all days in the chart
    const now = new Date();
    const lastTenDays = Array.from({ length: 10 }, (_: any, i: number) => {
      const date = new Date();
      date.setDate(now.getDate() - 9 + i); // Start 9 days ago
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    });
    
    // Create a map of the data from the database
    const dayMap: Record<string, { count: number; score: number }> = {};
    trendsResult.forEach((row: TrendRow) => {
      const day = new Date(row.day).toISOString().split('T')[0];
      dayMap[day] = {
        count: parseInt(row.count, 10),
        score: parseFloat(row.avg_score)
      };
    });
    
    // Fill in the data for all days
    lastTenDays.forEach(day => {
      const date = new Date(day);
      const formattedDay = `${date.getMonth() + 1}/${date.getDate()}`; // MM/DD format
      
      labels.push(formattedDay);
      counts.push(dayMap[day]?.count || 0);
      scores.push(dayMap[day]?.score || 0);
    });

    return NextResponse.json({
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Avg. Normalized Amount (proxy for anomaly score)',
          borderColor: '#ff6384',
          borderWidth: 2,
          fill: false,
          data: scores,
          yAxisID: 'y-axis-2',
        },
        {
          type: 'bar',
          label: 'Number of Anomalies',
          backgroundColor: '#36a2eb',
          data: counts,
          yAxisID: 'y-axis-1',
        }
      ],
      queriedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API Error - /api/metrics/anomaly-trends] Error fetching trend data:', error);
    let errorMessage = 'Failed to fetch trend data from server.';
    
    if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
