'use client';

/**
 * Dashboard Page Component
 * 
 * Contributors:
 * Priyanshu Patel: Led the development and integration of the end-to-end system. 
 * Additionally, contributed significantly to the frontend dashboard using Next.js and TailwindCSS, 
 * implementing real-time transaction visualization, anomaly tracking, and analytics views.
 */

import { AnomalyChart } from "@/components/dashboard/AnomalyChart";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { AnomaliesTable } from "@/components/dashboard/AnomaliesTable";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Real-time anomaly detection metrics and trends</p>
      </div>

      <DashboardSearch />

      <MetricsCards />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Anomaly Frequency</CardTitle>
            <CardDescription>
              Hourly distribution of anomalies vs. total transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnomalyChart />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Latest Anomalies</CardTitle>
            <CardDescription>
              The 10 most recent anomalies detected in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnomaliesTable />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}