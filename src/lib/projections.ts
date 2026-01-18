import { getSpendByPeriod } from './db';

export interface DataPoint {
  period: string;
  value: number;
}

export interface Projection {
  period: string;
  actual?: number;
  projected: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ProjectionResult {
  historical: DataPoint[];
  projections: Projection[];
  metrics: {
    trend: 'up' | 'down' | 'stable';
    growth_rate: number;
    confidence: number;
    r_squared?: number;
  };
}

function linearRegression(data: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, rSquared: 0 };

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let ssTotal = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += (i - xMean) ** 2;
    ssTotal += (data[i] - yMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  let ssResidual = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssResidual += (data[i] - predicted) ** 2;
  }

  const rSquared = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0;
  return { slope, intercept, rSquared };
}

function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function exponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
  if (data.length === 0) return [];
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function standardDeviation(data: number[]): number {
  if (data.length < 2) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.map(x => (x - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (data.length - 1));
}

function generateFuturePeriods(lastPeriod: string, count: number, periodType: 'week' | 'month' | 'year'): string[] {
  const periods: string[] = [];
  
  if (periodType === 'week') {
    const [year, week] = lastPeriod.split('-').map(Number);
    let currentYear = year;
    let currentWeek = week;
    
    for (let i = 0; i < count; i++) {
      currentWeek++;
      if (currentWeek > 52) { currentWeek = 1; currentYear++; }
      periods.push(`${currentYear}-${String(currentWeek).padStart(2, '0')}`);
    }
  } else if (periodType === 'month') {
    const [year, month] = lastPeriod.split('-').map(Number);
    let currentYear = year;
    let currentMonth = month;
    
    for (let i = 0; i < count; i++) {
      currentMonth++;
      if (currentMonth > 12) { currentMonth = 1; currentYear++; }
      periods.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
    }
  } else {
    let currentYear = parseInt(lastPeriod);
    for (let i = 0; i < count; i++) {
      currentYear++;
      periods.push(String(currentYear));
    }
  }
  
  return periods;
}

export async function generateProjections(
  periodType: 'week' | 'month' | 'year',
  periodsToProject: number,
  filters?: { pharmacy_id?: number; start_date?: Date; end_date?: Date }
): Promise<ProjectionResult> {
  const historicalData = await getSpendByPeriod(periodType, filters);
  
  if (historicalData.length === 0) {
    return {
      historical: [],
      projections: [],
      metrics: { trend: 'stable', growth_rate: 0, confidence: 0 },
    };
  }

  const values = historicalData.map(d => d.total);
  const periods = historicalData.map(d => d.period);

  const { slope, intercept, rSquared } = linearRegression(values);
  const smoothed = exponentialSmoothing(values, 0.3);
  const ma = movingAverage(values, Math.min(4, values.length));

  const futurePeriods = generateFuturePeriods(periods[periods.length - 1], periodsToProject, periodType);

  const stdDev = standardDeviation(values);
  const confidenceMultiplier = 1.96;

  const projections: Projection[] = futurePeriods.map((period, i) => {
    const linearProjection = slope * (values.length + i) + intercept;
    const smoothedTrend = smoothed[smoothed.length - 1] + (slope * (i + 1));
    const maTrend = ma[ma.length - 1] * (1 + (slope / ma[ma.length - 1] || 0)) ** (i + 1);

    const projected = (linearProjection * 0.4 + smoothedTrend * 0.35 + maTrend * 0.25);
    const uncertaintyGrowth = 1 + (i * 0.1);
    const margin = stdDev * confidenceMultiplier * uncertaintyGrowth;

    return {
      period,
      projected: Math.max(0, projected),
      lower_bound: Math.max(0, projected - margin),
      upper_bound: projected + margin,
    };
  });

  const recentGrowth = values.length >= 2 
    ? (values[values.length - 1] - values[values.length - 2]) / values[values.length - 2]
    : 0;
  
  const trend: 'up' | 'down' | 'stable' = 
    recentGrowth > 0.05 ? 'up' : recentGrowth < -0.05 ? 'down' : 'stable';

  const overallGrowth = values.length >= 2
    ? ((values[values.length - 1] - values[0]) / values[0]) * 100
    : 0;

  return {
    historical: historicalData.map(d => ({ period: d.period, value: d.total })),
    projections,
    metrics: {
      trend,
      growth_rate: overallGrowth,
      confidence: Math.max(0, Math.min(100, rSquared * 100)),
      r_squared: rSquared,
    },
  };
}

