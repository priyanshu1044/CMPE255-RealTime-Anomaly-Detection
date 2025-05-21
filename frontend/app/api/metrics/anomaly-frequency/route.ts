import { NextResponse } from 'next/server';
import { anomalyFrequencyData } from '@/lib/mock-data';

export async function GET() {
  try {
    const rawData = JSON.parse(JSON.stringify(anomalyFrequencyData));
    interface Dataset {
      data: number[];
    }

    interface AnomalyFrequencyData {
      datasets: Dataset[];
    }

    const data: AnomalyFrequencyData = JSON.parse(JSON.stringify(rawData));

    data.datasets.forEach((dataset: Dataset) => {
      dataset.data = dataset.data.map((value: number) => {
        const variation: number = Math.random() * 0.2 - 0.1; 
        return Math.max(0, Math.round(value * (1 + variation)));
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in anomaly-frequency API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anomaly frequency data' },
      { status: 500 }
    );
  }
}