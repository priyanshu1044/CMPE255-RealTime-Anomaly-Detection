import { subDays, addHours, format } from "date-fns";

export interface DummyAnomaly {
  id: string;
  userId: string;
  amount: number;
  timestamp: string;
  location: string;
  anomalyScore: number;
  description: string;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomFloatBetween(
  min: number,
  max: number,
  precision: number = 2
): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(precision));
}

function randomTimestamp(startDate: Date, endDate: Date): string {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime).toISOString();
}

const userIds = [
  "user_123",
  "user_456",
  "user_789",
  "user_101",
  "user_202",
  "user_303",
  "user_404",
  "user_505",
  "user_606",
  "user_707",
  "customer_1234",
  "customer_5678",
  "customer_9012",
  "customer_3456",
  "acct_7890123",
  "acct_4567890",
  "acct_1234567",
  "acct_8901234",
];

const locations = [
  "New York, USA",
  "London, UK",
  "Sydney, Australia",
  "Berlin, Germany",
  "Tokyo, Japan",
  "Paris, France",
  "Toronto, Canada",
  "Singapore",
  "São Paulo, Brazil",
  "Mumbai, India",
  "Amsterdam, Netherlands",
  "Dubai, UAE",
  "Seoul, South Korea",
  "Hong Kong",
  "Barcelona, Spain",
  "Cape Town, South Africa",
  "Moscow, Russia",
  "Mexico City, Mexico",
];

const anomalyDescriptions = [
  "Unusual transaction amount for this user",
  "Transaction from unusual location",
  "Multiple transactions in short time window",
  "Amount exceeds typical spending pattern",
  "Transaction outside normal hours",
  "Unusual merchant category",
  "Multiple failed authentication attempts",
  "Rapid succession of small transactions",
  "New device used for transaction",
  "Transaction amount significantly above average",
  "Suspicious IP address detected",
  "Unusual transaction frequency",
  "Transaction velocity exceeds normal pattern",
  "Abnormal transaction category for user profile",
  "Transaction matches known fraud pattern",
  "Unusual sequence of transactions detected",
  "Geolocation inconsistency detected",
  "Large purchase after a period of inactivity",
  "Unusual time of day for transaction type",
  "Multiple currency conversions in short period",
];

export function generateDummyAnomalies(
  count: number = 50,
  startDate: Date = subDays(new Date(), 30),
  endDate: Date = new Date()
): DummyAnomaly[] {
  const anomalies: DummyAnomaly[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = randomTimestamp(startDate, endDate);
    const userId = userIds[randomBetween(0, userIds.length - 1)];
    const location = locations[randomBetween(0, locations.length - 1)];
    const description =
      anomalyDescriptions[randomBetween(0, anomalyDescriptions.length - 1)];

    let amount;
    const amountRange = Math.random();
    if (amountRange < 0.7) {
      amount = randomFloatBetween(100, 1000, 2);
    } else if (amountRange < 0.9) {
      amount = randomFloatBetween(1000, 3000, 2);
    } else {
      amount = randomFloatBetween(3000, 5000, 2);
    }

    let baseScore = amount / 5000;
    let randomAdjustment = randomFloatBetween(-0.2, 0.2);
    let anomalyScore = Math.min(
      Math.max(baseScore + randomAdjustment, 0.1),
      0.98
    );

    anomalies.push({
      id: `anomaly-${i + 1}-${Date.now()}`,
      userId,
      amount,
      timestamp,
      location,
      anomalyScore,
      description,
    });
  }

  return anomalies.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export const dummyAnomalies = generateDummyAnomalies(100);

export function filterDummyAnomalies(
  anomalies: DummyAnomaly[],
  startDate?: Date,
  endDate?: Date,
  userId?: string,
  minAnomalyScore?: number
): DummyAnomaly[] {
  return anomalies.filter((anomaly) => {
    const anomalyDate = new Date(anomaly.timestamp);
    const matchesStartDate = !startDate || anomalyDate >= startDate;
    const matchesEndDate = !endDate || anomalyDate <= endDate;
    const matchesUser =
      !userId || anomaly.userId.toLowerCase().includes(userId.toLowerCase());
    const matchesScore =
      !minAnomalyScore || anomaly.anomalyScore >= minAnomalyScore;

    return matchesStartDate && matchesEndDate && matchesUser && matchesScore;
  });
}

if (typeof window !== "undefined") {
  (window as any).dummyAnomalies = dummyAnomalies;
}
