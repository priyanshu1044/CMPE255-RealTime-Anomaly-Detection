'use client';

/**
 * Anomalies Table Component
 * 
 * Contributors:
 * Priyanshu Patel: Designed and implemented key UI components including the real-time monitoring and export interfaces. 
 * Contributed significantly to the frontend dashboard using Next.js and TailwindCSS, implementing real-time transaction visualization and anomaly tracking.
 */

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockAnomalies } from "@/lib/mock-data";
import { formatDistanceToNow, format } from "date-fns";
import { RefreshCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Info,
  User,
  DollarSign,
  MapPin,
  Clock,
  BarChart3,
} from "lucide-react";

interface Anomaly {
  id: string;
  userId: string;
  amount: number;
  timestamp: string;
  location: string;
  anomalyScore: number;
  description: string;
}

export function AnomaliesTable() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchLatestAnomalies = () => {
    setLoading(true);

    setTimeout(() => {
      const shuffled = [...mockAnomalies]
        .sort(() => Math.random() - 0.5)
        .map((anomaly) => ({
          ...anomaly,
          timestamp: new Date(
            Date.now() - Math.floor(Math.random() * 8640000)
          ).toISOString(),
        }))
        .slice(0, 10);

      setAnomalies(shuffled);
      setLastRefreshed(new Date());
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    fetchLatestAnomalies();

    const intervalId = setInterval(fetchLatestAnomalies, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const handleRowClick = (anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          Last updated:{" "}
          {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLatestAnomalies}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden sm:table-cell">Timestamp</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anomalies.map((anomaly) => (
              <TableRow
                key={anomaly.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(anomaly)}
              >
                <TableCell className="font-medium">{anomaly.userId}</TableCell>
                <TableCell>${anomaly.amount.toFixed(2)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {anomaly.location}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatDistanceToNow(new Date(anomaly.timestamp), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      anomaly.anomalyScore > 0.85 ? "destructive" : "default"
                    }
                  >
                    {anomaly.anomalyScore.toFixed(2)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Anomaly Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Anomaly Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected anomaly.
            </DialogDescription>
          </DialogHeader>

          {selectedAnomaly && (
            <div className="space-y-4 py-2 overflow-y-auto pr-1">
              {/* Alert Badge */}
              <div className="flex justify-center mb-4">
                <Badge
                  variant="destructive"
                  className="text-md px-4 py-1 flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Anomaly Score: {selectedAnomaly.anomalyScore.toFixed(2)}
                </Badge>
              </div>

              {/* Description Box */}
              <div className="p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-950/50 rounded-md text-sm">
                <div className="font-medium mb-1">Anomaly Description</div>
                <p className="text-muted-foreground">
                  {selectedAnomaly.description}
                </p>
              </div>

              {/* Anomaly Details */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Transaction ID</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {selectedAnomaly.id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">User ID</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedAnomaly.userId}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Amount</div>
                    <div className="text-sm text-muted-foreground">
                      ${selectedAnomaly.amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedAnomaly.location}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Timestamp</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(selectedAnomaly.timestamp), "PPpp")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Anomaly Score</div>
                    <div className="text-sm">
                      <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                        <div
                          className="h-2.5 rounded-full bg-red-500"
                          style={{
                            width: `${selectedAnomaly.anomalyScore * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div className="text-right text-xs mt-1 text-muted-foreground">
                        {(selectedAnomaly.anomalyScore * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Warning Message */}
              <div className="mt-4 p-3 border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-950/50 rounded-md text-sm text-red-600 dark:text-red-400">
                <div className="font-medium mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Action Required
                </div>
                <p>
                  This transaction has been flagged as potentially fraudulent.
                  Please review and take appropriate action according to
                  security protocols.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
