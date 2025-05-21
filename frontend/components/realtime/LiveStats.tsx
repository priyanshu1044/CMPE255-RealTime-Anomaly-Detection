'use client';

import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

export function LiveStats() {
  const { transactions, isConnected } = useLiveTransactions(50);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [tps, setTps] = useState(0); 
  const processedTransactionIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (transactions.length === 0) return;
    
    const newTransactions = transactions.filter(t => !processedTransactionIds.current.has(t.id));
    
    if (newTransactions.length > 0) {
      setTotalCount(prevCount => prevCount + newTransactions.length);
      const newAnomalies = newTransactions.filter(t => t.isAnomaly);
      if (newAnomalies.length > 0) {
        setAnomalyCount(prevCount => prevCount + newAnomalies.length);
      }
      
      newTransactions.forEach(t => processedTransactionIds.current.add(t.id));
      
      console.log(`Added ${newTransactions.length} new transactions, ${newAnomalies.length} are anomalies`);
    }

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const recentTransactions = transactions.filter(
      t => new Date(t.timestamp) > oneMinuteAgo
    );
    setTps(Math.round((recentTransactions.length / 60) * 10) / 10);
  }, [transactions]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Status</div>
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Total Transactions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Total Transactions</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Counter with Animation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Anomalies</div>
            <motion.div 
              key={anomalyCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-red-500"
            >
              {anomalyCount}
            </motion.div>
          </div>
          <div className="text-xs text-muted-foreground text-right mt-1">
            {totalCount > 0 ? ((anomalyCount / totalCount) * 100).toFixed(1) : 0}% of total
          </div>
        </CardContent>
      </Card>

      {/* Transactions Per Second */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Transactions/sec</div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
              <div className="text-2xl font-bold">{tps}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}