'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { format, subDays } from 'date-fns';
import { DownloadCloud, FileJson, FileType, Filter, Calendar as CalendarIcon } from 'lucide-react';

interface Anomaly {
  id: string;
  userId: string;
  amount: number;
  timestamp: string;
  location: string;
  anomalyScore: number;
  description: string;
}

interface FilterOptions {
  startDate: Date;
  endDate: Date;
  userId: string;
  minAnomalyScore: number;
  includeUserId: boolean;
  includeAmount: boolean;
  includeLocation: boolean;
  includeTimestamp: boolean;
  includeAnomalyScore: boolean;
  includeDescription: boolean;
}

export default function ExportPage() {
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: subDays(new Date(), 7), 
    endDate: new Date(),
    userId: '',
    minAnomalyScore: 0.5,
    includeUserId: true,
    includeAmount: true,
    includeLocation: true,
    includeTimestamp: true,
    includeAnomalyScore: true,
    includeDescription: true
  });

  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<Anomaly[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [dataSource, setDataSource] = useState<'database' | 'mock' | null>(null);

  
  const handleDateChange = (field: 'startDate' | 'endDate', value: Date | undefined) => {
    if (value) {
      setFilters({
        ...filters,
        [field]: value
      });
    }
  };

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      userId: e.target.value
    });
  };

  const handleScoreChange = (value: number[]) => {
    setFilters({
      ...filters,
      minAnomalyScore: value[0]
    });
  };

  const handleCheckboxChange = (field: keyof FilterOptions) => {
    setFilters({
      ...filters,
      [field]: !filters[field]
    });
  };

  useEffect(() => {
    const loadPreviewData = async () => {
      setIsLoadingPreview(true);
      try {
        const data = await fetchFilteredData();
        setPreviewData(data.slice(0, 5)); 
      } catch (error) {
        console.error('Error loading preview data:', error);
      } finally {
        setIsLoadingPreview(false);
      }
    };
    
    loadPreviewData();
  }, [filters.startDate, filters.endDate, filters.userId, filters.minAnomalyScore]);

  const fetchFilteredData = async (): Promise<Anomaly[]> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('startDate', filters.startDate.toISOString());
      queryParams.append('endDate', filters.endDate.toISOString());
      
      if (filters.userId) {
        queryParams.append('userId', filters.userId);
      }
      
      if (filters.minAnomalyScore > 0) {
        queryParams.append('minScore', filters.minAnomalyScore.toString());
      }
      const response = await fetch(`/api/anomalies/export?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch anomaly data: ${response.statusText}`);
      }
      const result = await response.json();
      console.log(`Fetched ${result.data.length} anomalies from ${result.source}`);
      
      setDataSource(result.source);
      
      return result.data;
    } catch (error) {
      console.error('Error fetching filtered data:', error);
      return [];
    }
  };
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchFilteredData();
      setExportedCount(data.length);
      
      const filteredData = data.map(item => {
        const filtered: Partial<Anomaly> = {};
        if (filters.includeUserId) filtered.userId = item.userId;
        if (filters.includeAmount) filtered.amount = item.amount;
        if (filters.includeTimestamp) filtered.timestamp = item.timestamp;
        if (filters.includeLocation) filtered.location = item.location;
        if (filters.includeAnomalyScore) filtered.anomalyScore = item.anomalyScore;
        if (filters.includeDescription) filtered.description = item.description;
        return filtered;
      });
      
      
      let fileContent = '';
      let fileName = '';
      let mimeType = '';
      
      if (exportFormat === 'csv') {
        const headers = Object.keys(filteredData[0] || {}).join(',');
        const rows = filteredData.map(item => Object.values(item).join(','));
        fileContent = [headers, ...rows].join('\n');
        fileName = `anomaly-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        mimeType = 'text/csv';
      } else {
        fileContent = JSON.stringify(filteredData, null, 2);
        fileName = `anomaly-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
        mimeType = 'application/json';
      }
      
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Export Anomaly Data</h1>
        <p className="text-muted-foreground">
          Filter and export anomaly detection data for analysis
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Options
            </CardTitle>
            <CardDescription>
              Customize the data you want to export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Range */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Date Range</div>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Start Date</span>
                  <div className="flex items-center space-x-2 rounded-md border p-2">
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                    <span className="text-sm">
                      {format(filters.startDate, 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => handleDateChange('startDate', date)}
                      disabled={(date) =>
                        date > filters.endDate || date > new Date()
                      }
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">End Date</span>
                  <div className="flex items-center space-x-2 rounded-md border p-2">
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                    <span className="text-sm">
                      {format(filters.endDate, 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => handleDateChange('endDate', date)}
                      disabled={(date) =>
                        date < filters.startDate || date > new Date()
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">User ID (optional)</div>
              <Input 
                placeholder="Enter user ID to filter"
                value={filters.userId}
                onChange={handleUserIdChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Minimum Anomaly Score</div>
                <span className="text-sm text-muted-foreground">{filters.minAnomalyScore.toFixed(2)}</span>
              </div>
              <Slider
                defaultValue={[filters.minAnomalyScore]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleScoreChange}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.00</span>
                <span>0.50</span>
                <span>1.00</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DownloadCloud className="h-5 w-5" />
              Export Options
            </CardTitle>
            <CardDescription>
              Select fields and format for your export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Fields to Include</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="userId" 
                    checked={filters.includeUserId}
                    onCheckedChange={() => handleCheckboxChange('includeUserId')}
                  />
                  <label htmlFor="userId" className="text-sm">User ID</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="amount" 
                    checked={filters.includeAmount}
                    onCheckedChange={() => handleCheckboxChange('includeAmount')}
                  />
                  <label htmlFor="amount" className="text-sm">Amount</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="timestamp" 
                    checked={filters.includeTimestamp}
                    onCheckedChange={() => handleCheckboxChange('includeTimestamp')}
                  />
                  <label htmlFor="timestamp" className="text-sm">Timestamp</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="location" 
                    checked={filters.includeLocation}
                    onCheckedChange={() => handleCheckboxChange('includeLocation')}
                  />
                  <label htmlFor="location" className="text-sm">Location</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="anomalyScore" 
                    checked={filters.includeAnomalyScore}
                    onCheckedChange={() => handleCheckboxChange('includeAnomalyScore')}
                  />
                  <label htmlFor="anomalyScore" className="text-sm">Anomaly Score</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="description" 
                    checked={filters.includeDescription}
                    onCheckedChange={() => handleCheckboxChange('includeDescription')}
                  />
                  <label htmlFor="description" className="text-sm">Description</label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Export Format</div>
              <Tabs defaultValue="csv" onValueChange={(value) => setExportFormat(value as 'csv' | 'json')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="csv" className="flex items-center gap-2">
                    <FileType className="h-4 w-4" />
                    CSV
                  </TabsTrigger>
                  <TabsTrigger value="json" className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Button 
              className="w-full mt-6" 
              size="lg"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Data'}
              <DownloadCloud className="ml-2 h-4 w-4" />
            </Button>

            {exportedCount !== null && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {exportedCount} records exported successfully
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
          <CardDescription className="flex items-center gap-2">
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center p-6">
                  <div className="flex flex-col items-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                    <span className="mt-2 text-sm text-muted-foreground">Loading preview data...</span>
                  </div>
                </div>
              ) : previewData.length === 0 ? (
                <div className="flex items-center justify-center p-6">
                  <span className="text-sm text-muted-foreground">No data found with current filters</span>
                </div>
              ) : (
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      {filters.includeUserId && <th className="px-4 py-2 text-sm font-medium text-left">User ID</th>}
                      {filters.includeAmount && <th className="px-4 py-2 text-sm font-medium text-left">Amount</th>}
                      {filters.includeTimestamp && <th className="px-4 py-2 text-sm font-medium text-left">Timestamp</th>}
                      {filters.includeLocation && <th className="px-4 py-2 text-sm font-medium text-left">Location</th>}
                      {filters.includeAnomalyScore && <th className="px-4 py-2 text-sm font-medium text-left">Anomaly Score</th>}
                      {filters.includeDescription && <th className="px-4 py-2 text-sm font-medium text-left">Description</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((anomaly) => (
                      <tr key={anomaly.id} className="border-t">
                        {filters.includeUserId && <td className="px-4 py-2 text-sm">{anomaly.userId}</td>}
                        {filters.includeAmount && <td className="px-4 py-2 text-sm">${anomaly.amount.toFixed(2)}</td>}
                        {filters.includeTimestamp && <td className="px-4 py-2 text-sm">{format(new Date(anomaly.timestamp), 'MMM dd, yyyy HH:mm')}</td>}
                        {filters.includeLocation && <td className="px-4 py-2 text-sm">{anomaly.location}</td>}
                        {filters.includeAnomalyScore && <td className="px-4 py-2 text-sm">{anomaly.anomalyScore.toFixed(2)}</td>}
                        {filters.includeDescription && <td className="px-4 py-2 text-sm">{anomaly.description}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )};