export interface Anomaly {
  id: string;
  userId: string;
  amount: number;
  timestamp: string;
  location: string;
  anomalyScore: number;
  description: string;
}

export const mockAnomalies: Anomaly[] = [
  {
    id: "a1",
    userId: "user123",
    amount: 1299.99,
    timestamp: "2025-05-08T09:24:00Z",
    location: "New York, USA",
    anomalyScore: 0.89,
    description: "Unusual transaction amount for this user",
  },
  {
    id: "a2",
    userId: "user456",
    amount: 499.5,
    timestamp: "2025-05-08T08:15:00Z",
    location: "London, UK",
    anomalyScore: 0.76,
    description: "Transaction from unusual location",
  },
  {
    id: "a3",
    userId: "user789",
    amount: 159.99,
    timestamp: "2025-05-08T07:53:00Z",
    location: "Sydney, Australia",
    anomalyScore: 0.92,
    description: "Multiple transactions in short time window",
  },
  {
    id: "a4",
    userId: "user101",
    amount: 3500.0,
    timestamp: "2025-05-08T06:41:00Z",
    location: "Berlin, Germany",
    anomalyScore: 0.85,
    description: "Amount exceeds typical spending pattern",
  },
  {
    id: "a5",
    userId: "user202",
    amount: 899.99,
    timestamp: "2025-05-08T05:32:00Z",
    location: "Tokyo, Japan",
    anomalyScore: 0.78,
    description: "Transaction outside normal hours",
  },
  {
    id: "a6",
    userId: "user303",
    amount: 2100.0,
    timestamp: "2025-05-08T04:19:00Z",
    location: "Paris, France",
    anomalyScore: 0.81,
    description: "Unusual merchant category",
  },
  {
    id: "a7",
    userId: "user404",
    amount: 599.99,
    timestamp: "2025-05-08T03:05:00Z",
    location: "Toronto, Canada",
    anomalyScore: 0.74,
    description: "Multiple failed authentication attempts",
  },
  {
    id: "a8",
    userId: "user505",
    amount: 1750.0,
    timestamp: "2025-05-08T02:22:00Z",
    location: "Singapore",
    anomalyScore: 0.91,
    description: "Rapid succession of small transactions",
  },
  {
    id: "a9",
    userId: "user606",
    amount: 399.99,
    timestamp: "2025-05-08T01:18:00Z",
    location: "São Paulo, Brazil",
    anomalyScore: 0.83,
    description: "New device used for transaction",
  },
  {
    id: "a10",
    userId: "user707",
    amount: 2599.99,
    timestamp: "2025-05-08T00:05:00Z",
    location: "Mumbai, India",
    anomalyScore: 0.95,
    description: "Transaction amount significantly above average",
  },
];

export const summaryMetrics = {
  totalTransactions: 125876,
  anomaliesDetected: 237,
  lastUpdated: "2025-05-08T09:30:00Z",
  averageAnomalyScore: 0.84,
};

export const anomalyFrequencyData = {
  labels: [
    "00:00",
    "03:00",
    "06:00",
    "09:00",
    "12:00",
    "15:00",
    "18:00",
    "21:00",
  ],
  datasets: [
    {
      label: "Anomalies",
      data: [15, 12, 28, 22, 19, 31, 42, 33],
      backgroundColor: "rgba(99, 102, 241, 0.5)",
      borderColor: "rgb(99, 102, 241)",
      borderWidth: 1,
    },
    {
      label: "Transactions (hundreds)",
      data: [65, 42, 88, 102, 143, 156, 172, 133],
      backgroundColor: "rgba(161, 161, 170, 0.5)",
      borderColor: "rgb(161, 161, 170)",
      borderWidth: 1,
    },
  ],
};
