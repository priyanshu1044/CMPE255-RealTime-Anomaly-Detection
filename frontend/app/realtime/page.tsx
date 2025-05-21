'use client';

import { LiveStreamTable } from "@/components/realtime/LiveStreamTable";
import { LiveStats } from "@/components/realtime/LiveStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function RealtimePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Real-Time Stream</h1>
        <p className="text-muted-foreground">Monitor transaction stream in real-time with instant anomaly alerts</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <LiveStats />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Live Transaction Stream</CardTitle>
            <CardDescription>
              Real-time feed of transactions with immediate anomaly detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveStreamTable />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}