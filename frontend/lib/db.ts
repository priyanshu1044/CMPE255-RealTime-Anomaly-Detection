import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      user: process.env.DB_USER || 'user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'anomalies',
      password: process.env.DB_PASSWORD || 'pass',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    });

    pool.on('connect', () => {
      console.log('PostgreSQL pool - New client connected');
    });
    
    pool.on('error', (err) => {
      console.error('PostgreSQL pool - Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function executeQuery<T>(
  query: string, 
  params: any[] = []
): Promise<T[]> {
  const pool = getPool();
  let client;
  
  try {
    client = await pool.connect();
    const result = await client.query(query, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await executeQuery('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
