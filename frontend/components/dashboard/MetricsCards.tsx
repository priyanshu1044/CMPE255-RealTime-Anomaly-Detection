'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from 'react';

interface MetricsData {
  totalTransactions: number | null;
  lastUpdatedTimestamp: string | null; 
  totalAnomalies: number | null;
}

export function MetricsCards() {
  const [metrics, setMetrics] = useState<MetricsData>({ 
    totalTransactions: null, 
    lastUpdatedTimestamp: null, 
    totalAnomalies: null 
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData(isInitialCall: boolean) {
      if (isInitialCall && isMounted) {
      }
      try {
        const response = await fetch('/api/metrics/total-transactions');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText} (${response.status})`);
        }
        const data = await response.json();
        if (isMounted) {
          setMetrics({
            totalTransactions: data.totalTransactions,
            lastUpdatedTimestamp: data.lastUpdatedTimestamp,
            totalAnomalies: data.totalAnomalies,
          });
          setError(null); 
        }
      } catch (err: any) {
        console.error("Error fetching metrics:", err);
        if (isMounted) {
          setError(err.message || "Could not load data");
          
          if (isInitialCall) {
            setMetrics(prevMetrics => ({
              totalTransactions: prevMetrics.totalTransactions === null ? 0 : prevMetrics.totalTransactions,
              lastUpdatedTimestamp: prevMetrics.lastUpdatedTimestamp === null ? null : prevMetrics.lastUpdatedTimestamp,
              totalAnomalies: prevMetrics.totalAnomalies === null ? 0 : prevMetrics.totalAnomalies,
            }));
          }
        }
      } finally {
        if (isMounted && isInitialCall) {
          setIsInitialLoading(false);
        }
      }
    }

    fetchData(true); 
    const intervalId = setInterval(() => fetchData(false), 5000); 

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []); 

  const lastUpdatedDate = metrics.lastUpdatedTimestamp ? new Date(metrics.lastUpdatedTimestamp) : null;
  
  const getFormattedTimestamp = () => {
    if (!lastUpdatedDate) return { time: null, distance: null };
    return {
      time: lastUpdatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distance: formatDistanceToNow(lastUpdatedDate, { addSuffix: true })
    };
  };
  const { time: lastUpdatedTimeFormatted, distance: lastUpdatedDistanceFormatted } = getFormattedTimestamp();

  const anomaliesDisplay = metrics.totalAnomalies;
  const anomalyPercentage = metrics.totalTransactions && metrics.totalTransactions > 0 && metrics.totalAnomalies !== null
    ? (metrics.totalAnomalies / metrics.totalTransactions * 100).toFixed(3) 
    : "0.000";

  const renderMetricContent = (
    value: number | string | null, 
    fallbackValueIfErrorOnInitial: string | number = "N/A"
  ) => {
    const hasData = value !== null;
    
    if (isInitialLoading && !hasData && !error) {
      return (
        <div className="text-2xl font-bold flex items-center gap-2">
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
        </div>
      );
    }
    
    if (error && !hasData && isInitialLoading) {
      return <div className="text-2xl font-bold text-red-500">Error</div>;
    }
    
    if (hasData) {
      return (
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {error && !isInitialLoading && ( 
            <AlertTriangle className="h-4 w-4 text-red-500 inline-block ml-2" />
          )}
        </div>
      );
    }

    if (error && !isInitialLoading && !hasData) { 
        return <div className="text-2xl font-bold text-red-500">Error</div>; 
    }
    
    return <div className="text-2xl font-bold">{fallbackValueIfErrorOnInitial}</div>;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Total Transactions Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {renderMetricContent(metrics.totalTransactions, 0)}
            <p className="text-xs text-muted-foreground">
              Transactions processed (from DB)
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Anomalies Detected Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {renderMetricContent(anomaliesDisplay, 0)}
            <p className="text-xs text-muted-foreground">
              <span className={(metrics.totalAnomalies ?? 0) > 0 && anomalyPercentage !== "0.000" ? "text-red-500" : ""}>
                {anomalyPercentage}%
              </span> of total transactions (from DB)
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Last Updated Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {renderMetricContent(lastUpdatedTimeFormatted, "N/A")}
            <p className="text-xs text-muted-foreground">
              {lastUpdatedDistanceFormatted 
                ? `${lastUpdatedDistanceFormatted} (from DB)`
                : (isInitialLoading && !error) 
                  ? "Loading timestamp..." 
                  : (error && !metrics.lastUpdatedTimestamp) 
                    ? "Timestamp unavailable" 
                    : "Not available"}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}