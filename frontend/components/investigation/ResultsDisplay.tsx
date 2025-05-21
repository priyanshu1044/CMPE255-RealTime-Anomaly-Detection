'use client';

import { Anomaly } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface ResultsDisplayProps {
  results: Anomaly[];
}

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  if (!results.length) {
    return null;
  }

  const groupedByUser: Record<string, Anomaly[]> = {};
  results.forEach(anomaly => {
    if (!groupedByUser[anomaly.userId]) {
      groupedByUser[anomaly.userId] = [];
    }
    groupedByUser[anomaly.userId].push(anomaly);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedByUser).map(([userId, anomalies], index) => (
        <motion.div
          key={userId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>User: {userId}</span>
                <Badge variant="outline">
                  {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead className="hidden sm:table-cell">Timestamp</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomalies.map((anomaly) => (
                      <TableRow key={anomaly.id} className={anomaly.anomalyScore > 0.85 ? "bg-red-50 dark:bg-red-950/20" : ""}>
                        <TableCell className="font-medium">{anomaly.id}</TableCell>
                        <TableCell>${anomaly.amount.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">{anomaly.location}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {formatDistanceToNow(new Date(anomaly.timestamp), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={anomaly.anomalyScore > 0.85 ? "destructive" : anomaly.anomalyScore > 0.7 ? "default" : "secondary"}>
                            {anomaly.anomalyScore.toFixed(2)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-sm">
                <h4 className="font-medium mb-2">Anomaly Details:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {anomalies.map(anomaly => (
                    <li key={anomaly.id}>
                      <span className="text-muted-foreground">{anomaly.id}:</span> {anomaly.description}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}