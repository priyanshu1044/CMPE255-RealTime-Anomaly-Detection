'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, CreditCard } from "lucide-react";
import { mockAnomalies, Anomaly } from '@/lib/mock-data';

interface SearchPanelProps {
  onResultsFound: (results: Anomaly[]) => void;
}

export function SearchPanel({ onResultsFound }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'userId' | 'transactionId'>('userId');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setTimeout(() => {
      let results: Anomaly[] = [];
      
      if (searchType === 'userId') {
        results = mockAnomalies.filter(anomaly => 
          anomaly.userId.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else {
        results = mockAnomalies.filter(anomaly => 
          anomaly.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      onResultsFound(results);
      setIsSearching(false);
    }, 500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Investigation Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button
              variant={searchType === 'userId' ? 'default' : 'outline'}
              onClick={() => setSearchType('userId')}
              className="flex items-center gap-2 flex-1"
            >
              <User className="h-4 w-4" />
              User ID
            </Button>
            <Button
              variant={searchType === 'transactionId' ? 'default' : 'outline'}
              onClick={() => setSearchType('transactionId')}
              className="flex items-center gap-2 flex-1"
            >
              <CreditCard className="h-4 w-4" />
              Transaction ID
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search by ${searchType === 'userId' ? 'user ID' : 'transaction ID'}`}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Enter a {searchType === 'userId' ? 'user ID' : 'transaction ID'} to find anomalies and transaction history.
            {searchType === 'userId' && ' Try searching for "user123" or "user404".'}
            {searchType === 'transactionId' && ' Try searching for "a1" or "a5".'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}