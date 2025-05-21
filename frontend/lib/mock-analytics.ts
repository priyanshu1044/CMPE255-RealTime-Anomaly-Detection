export function getMockTrendData() {
  const now = new Date();
  const labels = [];
  const counts = [];
  const scores = [];

  for (let i = 9; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    const day = `${date.getMonth() + 1}/${date.getDate()}`;

    labels.push(day);
    counts.push(Math.floor(Math.random() * 20) + 5);
    scores.push(Math.random() * 0.5 + 0.3);
  }

  return {
    labels,
    datasets: [
      {
        type: "line",
        label: "Avg. Normalized Amount (proxy for anomaly score)",
        borderColor: "#ff6384",
        borderWidth: 2,
        fill: false,
        data: scores,
        yAxisID: "y-axis-2",
      },
      {
        type: "bar",
        label: "Number of Anomalies",
        backgroundColor: "#36a2eb",
        data: counts,
        yAxisID: "y-axis-1",
      },
    ],
    queriedAt: new Date().toISOString(),
  };
}

export function getMockHistogramData() {
  const histogram = [];
  const labels = [];

  for (let i = 0; i < 10; i++) {
    const start = (i * 500).toFixed(0);
    const end = ((i + 1) * 500).toFixed(0);
    labels.push(`$${start}-$${end}`);

    let count;
    if (i < 3) {
      count = Math.floor(Math.random() * 10) + 3;
    } else if (i < 7) {
      count = Math.floor(Math.random() * 25) + 10;
    } else {
      count = Math.floor(Math.random() * 8) + 2;
    }
    histogram.push(count);
  }

  return {
    labels,
    data: histogram,
    queriedAt: new Date().toISOString(),
  };
}
