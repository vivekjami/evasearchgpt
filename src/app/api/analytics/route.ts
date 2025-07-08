import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// In a production environment, we would store this in a database
const analytics = {
  searches: 0,
  avgResponseTime: 0,
  successRate: 100,
  totalApiCalls: 0,
  successfulApiCalls: 0,
  topQueries: [] as string[],
  responseTimes: [] as number[],
};

export async function GET() {
  return NextResponse.json({
    searches: analytics.searches,
    avgResponseTime: analytics.avgResponseTime,
    successRate: analytics.successRate,
    topQueries: analytics.topQueries.slice(0, 5),
  });
}

// Schema for metrics
const metricSchema = z.object({
  operation: z.string(),
  timestamp: z.string(),
  duration: z.number().optional(),
  success: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const metric = metricSchema.parse(body);
    
    // Update analytics based on the operation type
    if (metric.operation === 'search_api_total') {
      analytics.searches += 1;
      
      if (metric.duration) {
        analytics.responseTimes.push(metric.duration);
        
        // Calculate average response time (last 50 requests)
        const recentTimes = analytics.responseTimes.slice(-50);
        analytics.avgResponseTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
      }
      
      // Update success rate
      analytics.totalApiCalls += 1;
      if (metric.success) {
        analytics.successfulApiCalls += 1;
      }
      
      analytics.successRate = (analytics.successfulApiCalls / analytics.totalApiCalls) * 100;
      
      // Store query for top queries tracking
      if (metric.metadata?.query) {
        const query = metric.metadata.query as string;
        analytics.topQueries.push(query);
        
        // Keep only last 100 queries
        if (analytics.topQueries.length > 100) {
          analytics.topQueries.shift();
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Invalid metrics data' }, { status: 400 });
  }
}
