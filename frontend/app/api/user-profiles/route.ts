import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, checkDatabaseConnection } from '@/lib/db';

interface DBUserProfile {
  user_id: string;
  usual_locations: string | string[] | null;
  merchant_categories: string | string[] | null;
  device_types: string | string[] | null;
  avg_transaction_amount: string | number | null;
  model_score: string | number | null;
  last_updated: string;
}

export async function GET(request: NextRequest) {
  try {
    
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.warn('Database connection failed. Cannot retrieve user profiles.');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }
    
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let query = `
      SELECT 
        user_id, 
        usual_locations, 
        merchant_categories,
        device_types,
        avg_transaction_amount,
        model_score,
        last_updated
      FROM 
        user_profiles
    `;
    
    const queryParams: any[] = [];
    
    
    if (userId) {
      query += ' WHERE user_id = $1';
      queryParams.push(userId);
    } else {
      
      query += ' WHERE usual_locations IS NOT NULL ORDER BY last_updated DESC LIMIT 50';
    }
    
    
    const profiles = await executeQuery<DBUserProfile>(query, queryParams);
    
    
    const formattedProfiles = profiles.map((profile: DBUserProfile) => {
      
      const parsePostgresArray = (arr: string | string[] | null | undefined): string[] => {
        if (!arr) return [];
        
        if (Array.isArray(arr)) return arr;
        
        if (typeof arr === 'string' && arr.startsWith('{') && arr.endsWith('}')) {
          return arr.slice(1, -1).split(',').filter(Boolean).map(s => s.trim());
        }
        return [];
      };
      
      return {
        userId: profile.user_id,
        usualLocations: parsePostgresArray(profile.usual_locations),
        merchantCategories: parsePostgresArray(profile.merchant_categories),
        deviceTypes: parsePostgresArray(profile.device_types),
        avgTransactionAmount: typeof profile.avg_transaction_amount === 'number' 
          ? profile.avg_transaction_amount 
          : parseFloat(String(profile.avg_transaction_amount || '0')),
        modelScore: typeof profile.model_score === 'number'
          ? profile.model_score
          : parseFloat(String(profile.model_score || '0')),
        lastUpdate: profile.last_updated
      };
    });
    
    return NextResponse.json(formattedProfiles);
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profiles' },
      { status: 500 }
    );
  }
}
