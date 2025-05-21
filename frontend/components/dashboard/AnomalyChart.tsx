"use client";

import { useEffect, useRef, useState } from "react";
import { Chart, registerables, ChartConfiguration, ChartData } from "chart.js";
import { TimeRangeSelector } from "./TimeRangeSelector";

Chart.register(...registerables);

interface HourlyDataPoint {
  hour: string;
  anomalies: number;
}

interface ApiData {
  hourlyData: HourlyDataPoint[];
  timeRange: string;
  queriedAt: string;
}

export function AnomalyChart() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const [timeRange, setTimeRange] = useState("24h");

  const refreshInterval = 30000;

  async function fetchData(isInitialLoad = false) {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(
        `/api/metrics/hourly-activity?timeRange=${timeRange}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch hourly data: ${response.statusText}`);
      }
      const data: ApiData = await response.json();

      const labels = data.hourlyData.map((d) => d.hour);
      const anomalyCounts = data.hourlyData.map((d) => d.anomalies);

      setChartData({
        labels: labels,
        datasets: [
          {
            label: "Anomalies",
            data: anomalyCounts,
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            borderWidth: 1,
          },
        ],
      });

      setLastRefreshTime(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Error fetching chart data:", err);
      setError(err.message || "Could not load chart data");
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetchData(true);

    const intervalId = setInterval(() => {
      if (isMounted) {
        fetchData(false);
      }
    }, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [timeRange]);

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    setIsLoading(true);
  };

  const getChartTitleText = () => {
    switch (timeRange) {
      case "1h":
        return "Time (Last 1 Hour - UTC)";
      case "6h":
        return "Time (Last 6 Hours - UTC)";
      case "12h":
        return "Time (Last 12 Hours - UTC)";
      case "7d":
        return "Time (Last 7 Days - UTC)";
      case "30d":
        return "Time (Last 30 Days - UTC)";
      case "24h":
      default:
        return "Time (Last 24 Hours - UTC)";
    }
  };

  useEffect(() => {
    if (!chartRef.current || !chartData) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (ctx) {
      const config: ChartConfiguration = {
        type: "bar",
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Count",
              },
            },
            x: {
              title: {
                display: true,
                text: getChartTitleText(),
              },
            },
          },
          plugins: {
            legend: {
              position: "top",
            },
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
        },
      };
      chartInstance.current = new Chart(ctx, config);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [chartData, timeRange]);

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Anomaly Frequency</h3>
        <TimeRangeSelector
          selectedRange={timeRange}
          onRangeChange={handleTimeRangeChange}
        />
      </div>

      <div className="w-full h-[300px] relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-lg">Loading chart data...</div>
          </div>
        )}

        {/* Error overlay */}
        {error && !chartData && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-lg text-red-500">
              Error loading chart: {error}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!chartData && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-lg">No data available for the chart.</div>
          </div>
        )}

        {/* Chart canvas */}
        <canvas ref={chartRef} />

        {/* Refresh indicator */}
        {isRefreshing && !isLoading && (
          <div className="absolute top-2 right-2 text-xs text-muted-foreground animate-pulse">
            Refreshing...
          </div>
        )}

        {/* Last updated timestamp */}
        {lastRefreshTime && !isRefreshing && !isLoading && (
          <div className="absolute bottom-0 right-2 text-xs text-muted-foreground">
            Last updated: {lastRefreshTime.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
