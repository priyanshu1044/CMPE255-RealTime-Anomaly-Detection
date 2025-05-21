'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

interface AnomalyTrendChartProps {
  filters?: {
    date?: Date;
    scoreThreshold?: number;
    userId?: string;
  };
}

interface TrendData {
  labels: string[];
  counts: number[];
  scores: number[];
  queriedAt: string;
}

export function AnomalyTrendChart({ filters }: AnomalyTrendChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<TrendData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      try {
        let queryParams = new URLSearchParams();
        
        if (filters?.date) {
          queryParams.append('date', filters.date.toISOString());
        }
        
        if (filters?.scoreThreshold) {
          queryParams.append('scoreThreshold', filters.scoreThreshold.toString());
        }
        
        if (filters?.userId) {
          queryParams.append('userId', filters.userId);
        }
        
        const response = await fetch(`/api/metrics/anomaly-trends?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch trend data: ${response.statusText}`);
        }
        
        const data: TrendData = await response.json();
        setChartData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trend data');
        setChartData(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [filters]); 

  useEffect(() => {
    if (!chartRef.current || !chartData) return;
    
    
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Anomaly Score Avg',
            data: chartData.scores,
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            yAxisID: 'y'
          },
          {
            label: 'Anomaly Count',
            data: chartData.counts,
            borderColor: 'rgb(220, 38, 38)',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Anomaly Score'
            },
            min: 0,
            max: 1,
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Anomaly Count'
            },
            grid: {
              drawOnChartArea: false,
            },
            beginAtZero: true
          }
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false
          },
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: filters?.userId 
              ? `Anomaly Trends (User: ${filters.userId})`
              : 'Anomaly Trends'
          }
        }
      }
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData, filters?.userId]);

  return (
    <div className="w-full h-[300px] relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-lg">Loading trend data...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-lg text-red-500">Error: {error}</div>
        </div>
      )}
      
      {!chartData && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-lg">No trend data available.</div>
        </div>
      )}
      
      <canvas ref={chartRef} />
    </div>
  );
}
