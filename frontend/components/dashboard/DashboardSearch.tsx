"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, User, CreditCard } from "lucide-react";
import { mockAnomalies, Anomaly } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";

export function DashboardSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Anomaly[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchType, setSearchType] = useState<"userId" | "transactionId">(
    "userId"
  );

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    setTimeout(() => {
      let results: Anomaly[] = [];

      if (searchType === "userId") {
        results = mockAnomalies.filter((anomaly) =>
          anomaly.userId.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else {
        results = mockAnomalies.filter((anomaly) =>
          anomaly.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setSearchResults(results);
      setIsSearching(false);

      if (results.length > 0) {
        setIsResultsOpen(true);
      }
    }, 500);
  };

  const handleRowClick = (anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
    setIsDetailsOpen(true);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsResultsOpen(false);
  };

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex space-x-2 mb-2">
              <Button
                variant={searchType === "userId" ? "default" : "outline"}
                onClick={() => setSearchType("userId")}
                size="sm"
                className="flex items-center gap-1"
              >
                <User className="h-3 w-3" />
                User
              </Button>
              <Button
                variant={searchType === "transactionId" ? "default" : "outline"}
                onClick={() => setSearchType("transactionId")}
                size="sm"
                className="flex items-center gap-1"
              >
                <CreditCard className="h-3 w-3" />
                Transaction
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={`Search by ${
                    searchType === "userId" ? "user ID" : "transaction ID"
                  }`}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Quick search for anomalies by{" "}
              {searchType === "userId" ? "user ID" : "transaction ID"}
              {searchType === "userId" && ' (e.g., "user123", "user404")'}
              {searchType === "transactionId" && ' (e.g., "a1", "a5")'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Dialog */}
      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Search Results</DialogTitle>
          </DialogHeader>

          <div className="text-sm mb-4">
            Found {searchResults.length} result
            {searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
          </div>

          {searchResults.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Location
                    </TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((anomaly) => (
                    <TableRow
                      key={anomaly.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(anomaly)}
                    >
                      <TableCell>{anomaly.userId}</TableCell>
                      <TableCell className="font-medium">
                        {anomaly.id}
                      </TableCell>
                      <TableCell>${anomaly.amount.toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {anomaly.location}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            anomaly.anomalyScore > 0.85
                              ? "destructive"
                              : "default"
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No results found. Try a different search term.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Anomaly Details
            </DialogTitle>
          </DialogHeader>

          {selectedAnomaly && (
            <div className="space-y-4 py-2 overflow-y-auto pr-1">
              <div className="flex justify-center mb-4">
                <Badge
                  variant="destructive"
                  className="text-md px-4 py-1 flex items-center gap-2"
                >
                  Anomaly Score: {selectedAnomaly.anomalyScore.toFixed(2)}
                </Badge>
              </div>

              <div className="p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-950/50 rounded-md text-sm">
                <div className="font-medium mb-1">Anomaly Description</div>
                <p className="text-muted-foreground">
                  {selectedAnomaly.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
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
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Transaction ID</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {selectedAnomaly.id}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
