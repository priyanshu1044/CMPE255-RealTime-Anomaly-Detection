'use client';

import { useState } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Filter, Search } from "lucide-react";
import { format } from "date-fns";

export function AnalyticsFilters({ onFiltersChange }: { onFiltersChange: (filters: any) => void }) {
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());
  const [scoreThreshold, setScoreThreshold] = useState([0.7]);
  const [userId, setUserId] = useState("");

  const handleApplyFilters = () => {
    onFiltersChange({
      date: dateRange,
      scoreThreshold: scoreThreshold[0],
      userId: userId.trim() || undefined,
    });
  };

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="border rounded-md overflow-hidden bg-white dark:bg-zinc-900">
              <Calendar
                mode="single"
                selected={dateRange}
                onSelect={setDateRange}
                className="w-full"
                styles={{
                  caption: { textTransform: 'capitalize' }
                }}
                classNames={{
                  head_cell: "text-muted-foreground font-normal text-xs",
                  cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Amount Threshold<br /><span className="text-xs text-muted-foreground">(Normalized)</span></label>
              <span className="text-sm font-bold">{scoreThreshold[0].toFixed(2)}</span>
            </div>
            <Slider
              defaultValue={scoreThreshold}
              max={1}
              min={0}
              step={0.01}
              onValueChange={setScoreThreshold}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.00</span>
              <span>0.50</span>
              <span>1.00</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Approximate dollar value: <span className="font-medium">${(scoreThreshold[0] * 5000).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Button onClick={handleApplyFilters} className="w-full mt-4">
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}