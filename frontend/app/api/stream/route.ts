export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const responseInit = {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  };

  let responseBody = '';

  const transaction = {
    id: `txn-${Math.random().toString(36).substring(2, 10)}`,
    userId: `user${Math.floor(Math.random() * 1000)}`,
    amount: parseFloat((Math.random() * 1000).toFixed(2)),
    timestamp: new Date().toISOString(),
    location: ['New York', 'London', 'Tokyo', 'Sydney', 'Berlin'][Math.floor(Math.random() * 5)],
    isAnomaly: Math.random() > 0.8,
    anomalyScore: parseFloat((Math.random()).toFixed(2))
  };
  
  responseBody = `event: transaction\ndata: ${JSON.stringify(transaction)}\n\n`;

  return new Response(responseBody, responseInit);
}