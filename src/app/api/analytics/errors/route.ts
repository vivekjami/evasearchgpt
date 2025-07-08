import { NextRequest, NextResponse } from 'next/server';
import { PerformanceMonitor } from '@/utils/performance-monitor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, context, timestamp = new Date().toISOString() } = body;
    
    // Log the error for analytics
    console.error('Client error tracked:', error, 'Context:', context);
    
    // Record error in performance monitoring
    PerformanceMonitor.logMetric({
      operation: 'client_error',
      duration: 0,
      timestamp,
      success: false,
      metadata: {
        error,
        context
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Error logged successfully'
    });
    
  } catch (error) {
    console.error('Error logging client error:', error);
    
    return NextResponse.json(
      { error: 'Error logging failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
