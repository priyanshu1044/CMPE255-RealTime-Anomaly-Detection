'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

interface AnomalyScoreHistogramProps {
  filters?: {
    date?: Date;
    scoreThreshold?: number;
    userId?: string;
  };
}

interface HistogramData {
  labels: string[];
  data: number[];
  queriedAt: string;
}

export function AnomalyScoreHistogram({ filters }: AnomalyScoreHistogramProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);

  useEffect(() => {
    const fetchHistogramData = async () => {
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
        
        const response = await fetch(`/api/metrics/score-distribution?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch histogram data: ${response.statusText}`);
        }
        
        const data: HistogramData = await response.json();
        setHistogramData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching histogram data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch histogram data');
        setHistogramData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistogramData();
  }, [filters]); 

  useEffect(() => {
    if (!chartRef.current) return;
    
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (!histogramData) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: histogramData.labels,
        datasets: [
          {
            label: 'Frequency',
            data: histogramData.data,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Transaction Amount Range'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems) {
                const item = tooltipItems[0];
                const range = histogramData.labels[item.dataIndex];
                return `Amount Range: ${range}`;
              },
              label: function(context) {
                return `Count: ${context.parsed.y}`;
              }
            }
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
  }, [histogramData]);

  return (
    <div className="w-full h-[300px] relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-lg">Loading histogram data...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-lg text-red-500">Error: {error}</div>
        </div>
      )}
      
      {!histogramData && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-lg">No histogram data available.</div>
        </div>
      )}
      
      <canvas ref={chartRef} />
    </div>
  );
}
