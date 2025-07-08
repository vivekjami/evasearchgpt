import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PerformanceMetric } from '@/types/analytics';

// In-memory store for metrics (would be a database in production)
const metrics: PerformanceMetric[] = [];
const MAX_STORED_METRICS = 1000;

// Schema for incoming metrics
const metricSchema = z.object({
  operation: z.string(),
  duration: z.number().optional(),
  timestamp: z.string(),
  success: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const metric = metricSchema.parse(body);
    
    // Store the metric
    metrics.push(metric as PerformanceMetric);
    
    // Keep only recent metrics
    if (metrics.length > MAX_STORED_METRICS) {
      metrics.shift();
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json({ error: 'Invalid metric data' }, { status: 400 });
  }
}

export async function GET() {
  // Calculate average durations by operation
  const operations = new Map<string, { total: number; count: number; avgDuration: number }>();
  
  metrics.forEach(metric => {
    if (metric.duration) {
      const existing = operations.get(metric.operation);
      
      if (existing) {
        existing.total += metric.duration;
        existing.count += 1;
        existing.avgDuration = existing.total / existing.count;
      } else {
        operations.set(metric.operation, {
          total: metric.duration,
          count: 1,
          avgDuration: metric.duration
        });
      }
    }
  });
  
  // Calculate success rates
  const successRates = new Map<string, { success: number; total: number; rate: number }>();
  
  metrics.forEach(metric => {
    const existing = successRates.get(metric.operation);
    
    if (existing) {
      existing.total += 1;
      if (metric.success) {
        existing.success += 1;
      }
      existing.rate = (existing.success / existing.total) * 100;
    } else {
      successRates.set(metric.operation, {
        success: metric.success ? 1 : 0,
        total: 1,
        rate: metric.success ? 100 : 0
      });
    }
  });
  
  // Convert maps to objects for the response
  const performanceByOperation = Object.fromEntries(
    Array.from(operations.entries()).map(([key, value]) => [key, value.avgDuration])
  );
  
  const successRateByOperation = Object.fromEntries(
    Array.from(successRates.entries()).map(([key, value]) => [key, value.rate])
  );
  
  return NextResponse.json({
    totalMetricsCollected: metrics.length,
    performanceByOperation,
    successRateByOperation,
    lastUpdated: new Date().toISOString(),
  });
}
