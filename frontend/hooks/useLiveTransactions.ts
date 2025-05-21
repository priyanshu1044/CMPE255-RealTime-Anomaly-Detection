import { useState, useEffect, useRef } from 'react';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  timestamp: string;
  location: string;
  isAnomaly: boolean;
  anomalyScore?: number;
}

export function useLiveTransactions(maxItems: number = 50) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const response = await fetch('/api/stream');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        
        const eventData = text.split('\n')
          .find(line => line.startsWith('data:'))
          ?.replace('data:', '')
          .trim();
          
        if (eventData) {
          const newTransaction = JSON.parse(eventData) as Transaction;
          setTransactions(prev => [newTransaction, ...prev].slice(0, maxItems));
          setIsConnected(true);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching transaction:', err);
        setIsConnected(false);
        setError('Connection error. Trying again...');
      }
    };

    fetchTransaction();
    setIsConnected(true);
    
    pollingRef.current = setInterval(fetchTransaction, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        setIsConnected(false);
      }
    };
  }, [maxItems]);

  return { transactions, isConnected, error };
}