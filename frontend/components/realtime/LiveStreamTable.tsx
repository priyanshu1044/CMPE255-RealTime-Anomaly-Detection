'use client';

/**
 * Live Stream Table Component
 * 
 * Contributors:
 * Priyanshu Patel: Designed and implemented key UI components including the real-time monitoring and export interfaces. 
 * Contributed significantly to the frontend dashboard using Next.js and TailwindCSS, implementing real-time transaction visualization and anomaly tracking.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLiveTransactions, Transaction } from "@/hooks/useLiveTransactions";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Info, User, DollarSign, MapPin, Clock, BarChart3 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function LiveStreamTable() {
  const { transactions, isConnected, error } = useLiveTransactions(50);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden sm:table-cell">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {transactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={
                      transaction.isAnomaly 
                        ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500 cursor-pointer hover:bg-muted/50" 
                        : "border-l-4 border-l-green-500 cursor-pointer hover:bg-muted/50"
                    }
                    onClick={() => handleRowClick(transaction)}
                  >
                    <TableCell>
                      {transaction.isAnomaly ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <Badge variant="destructive">Anomaly</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <Badge variant="outline">Normal</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{transaction.id}</TableCell>
                    <TableCell>{transaction.userId}</TableCell>
                    <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">{transaction.location}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatDistanceToNow(new Date(transaction.timestamp), { addSuffix: true })}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {error ? (
                      <div className="text-red-500">{error}</div>
                    ) : (
                      <div>Waiting for transactions...</div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected transaction.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4 py-2">
              {/* Status Badge */}
              <div className="flex justify-center mb-4">
                {selectedTransaction.isAnomaly ? (
                  <Badge variant="destructive" className="text-md px-4 py-1 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Anomaly Detected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-md px-4 py-1 border-green-500 text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Normal Transaction
                  </Badge>
                )}
              </div>

              {/* Transaction Details */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Transaction ID</div>
                    <div className="text-sm text-muted-foreground font-mono">{selectedTransaction.id}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">User ID</div>
                    <div className="text-sm text-muted-foreground">{selectedTransaction.userId}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Amount</div>
                    <div className="text-sm text-muted-foreground">${selectedTransaction.amount.toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div className="text-sm text-muted-foreground">{selectedTransaction.location}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Timestamp</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(selectedTransaction.timestamp), "PPpp")}
                    </div>
                  </div>
                </div>

                {selectedTransaction.anomalyScore !== undefined && (
                  <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Anomaly Score</div>
                      <div className="text-sm">
                        <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                          <div 
                            className={`h-2.5 rounded-full ${selectedTransaction.isAnomaly ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${selectedTransaction.anomalyScore * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-right text-xs mt-1 text-muted-foreground">
                          {(selectedTransaction.anomalyScore * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Anomaly Warning Message */}
              {selectedTransaction.isAnomaly && (
                <div className="mt-4 p-3 border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-950/50 rounded-md text-sm text-red-600 dark:text-red-400">
                  <div className="font-medium mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Anomaly Detection Warning
                  </div>
                  <p>
                    This transaction has been flagged as potentially fraudulent by our anomaly detection system.
                    Further investigation is recommended.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}