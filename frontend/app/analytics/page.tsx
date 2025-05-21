'use client';

import { useState } from 'react';
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { AnomalyScoreHistogram } from "@/components/analytics/AnomalyScoreHistogram";
import { AnomalyTrendChart } from "@/components/analytics/AnomalyTrendChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<{
    date?: Date;
    scoreThreshold?: number;
    userId?: string;
  }>({});

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    console.log('Filters applied:', newFilters);
  };

  return (
    <div className="flex flex-col gap-8 pb-12 overflow-x-hidden">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Analyze and explore anomaly data with advanced visualizations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-x-8 gap-y-12 min-w-0">
        <div className="min-w-0">
          <div className="lg:sticky lg:top-4 overflow-x-hidden overflow-y-visible">
            <AnalyticsFilters onFiltersChange={handleFiltersChange} />
          </div>
        </div>

        <div className="space-y-12 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-md border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle>Anomaly Trends</CardTitle>
                <CardDescription>
                  Anomaly count and average score over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <AnomalyTrendChart filters={filters} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="shadow-md border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle>Transaction Amount Distribution</CardTitle>
                <CardDescription>
                  Histogram showing the distribution of anomalous transaction amounts
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <AnomalyScoreHistogram filters={filters} />
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}