import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, checkDatabaseConnection } from '@/lib/db';
import { mockAnomalies } from '@/lib/mock-data';
import { dummyAnomalies, filterDummyAnomalies } from '@/lib/dummy-data';

interface AnomalyRecord {
  id: string;
  user_id: string;
  amount: number;
  timestamp: string | number;
  location: string;
  description: string;
  anomaly_score?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const minScore = searchParams.get('minScore') ? parseFloat(searchParams.get('minScore')!) : 0;

    const isConnected = await checkDatabaseConnection();
    
    if (!isConnected) {
      console.warn('Database connection failed. Using dummy data for export.');
      
      const startDateObj = startDate ? new Date(startDate) : undefined;
      const endDateObj = endDate ? new Date(endDate) : undefined;
      
      const filteredData = filterDummyAnomalies(
        dummyAnomalies,
        startDateObj,
        endDateObj,
        userId || undefined,
        minScore
      );
      
      console.log(`Returning ${filteredData.length} dummy anomalies`);
      
      return NextResponse.json({
        data: filteredData,
        source: 'mock',
        count: filteredData.length
      });
    }

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    
    if (startDate) {
      whereConditions.push('timestamp >= $' + (queryParams.length + 1));
      // Convert to Unix timestamp if needed
      queryParams.push(Math.floor(new Date(startDate).getTime() / 1000));
    }
    
    if (endDate) {
      whereConditions.push('timestamp <= $' + (queryParams.length + 1));
      // Convert to Unix timestamp if needed and add a day to include the end date
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      queryParams.push(Math.floor(endDateObj.getTime() / 1000));
    }
    
    if (userId) {
      whereConditions.push('user_id::text LIKE $' + (queryParams.length + 1));
      queryParams.push(`%${userId}%`);
    }
    
    if (minScore > 0) {
      // Convert the 0-1 score to an amount threshold (assuming amount is used as proxy for anomaly score)
      const amountThreshold = minScore * 5000;
      whereConditions.push('amount >= $' + (queryParams.length + 1));
      queryParams.push(amountThreshold);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Query to fetch anomalies with filters
    const query = `
      SELECT 
        id::text, 
        user_id, 
        amount, 
        timestamp, 
        location, 
        description,
        LEAST(amount / 5000, 1.0) as anomaly_score
      FROM frauds
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 1000
    `;
    
    console.log('Executing export query with params:', queryParams);
    const results = await executeQuery<AnomalyRecord>(query, queryParams);
    
    // Transform database records to match the expected Anomaly interface
    const anomalies = results.map(record => {
      // Convert Unix timestamp to ISO string if needed
      let timestampStr: string;
      if (typeof record.timestamp === 'number') {
        timestampStr = new Date(record.timestamp * 1000).toISOString();
      } else {
        // Try to parse it as a number first
        const timestampNum = parseInt(record.timestamp, 10);
        if (!isNaN(timestampNum)) {
          timestampStr = new Date(timestampNum * 1000).toISOString();
        } else {
          // If already a string in ISO format, use as is
          timestampStr = record.timestamp;
        }
      }

      return {
        id: record.id,
        userId: record.user_id,
        amount: record.amount,
        timestamp: timestampStr,
        location: record.location || 'Unknown',
        anomalyScore: record.anomaly_score !== undefined ? record.anomaly_score : Math.min(record.amount / 5000, 1.0),
        description: record.description || 'No description available'
      };
    });
    
    return NextResponse.json({ 
      data: anomalies,
      source: 'database',
      count: anomalies.length
    });
    
  } catch (error) {
    console.error('[API Error - /api/anomalies/export] Error fetching anomalies:', error);
    
    console.warn('Falling back to dummy data due to error');
    
    const filteredData = dummyAnomalies.slice(0, 50);
    
    return NextResponse.json({ 
      data: filteredData,
      source: 'mock',
      count: filteredData.length,
      error: 'Database error, using mock data instead',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
