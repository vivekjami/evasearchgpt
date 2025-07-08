import { PerformanceMetric } from '@/types/analytics';

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 1000;
  
  // Start timing an operation
  static startTimer(operation: string): (success?: boolean, metadata?: Record<string, any>) => number {
    const start = performance.now();
    const startTime = new Date().toISOString();
    
    return (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = performance.now() - start;
      
      this.logMetric({
        operation,
        duration,
        timestamp: startTime,
        success,
        metadata,
      });
      
      return duration;
    };
  }
  
  // Log a performance metric
  static logMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${metric.operation}: ${metric.duration.toFixed(2)}ms ${metric.success ? '✅' : '❌'}`);
    }
    
    // Send to analytics service if configured
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric);
    }
  }
  
  // Send metrics to external analytics service
  private static sendToAnalytics(metric: PerformanceMetric) {
    // Using fetch instead of axios to avoid dependency issues
    fetch('/api/analytics/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
    }).catch(error => {
      console.error('Failed to send analytics:', error);
    });
  }
  
  // Get performance statistics
  static getStats(operation?: string): {
    averageTime: number;
    successRate: number;
    totalOperations: number;
    slowestOperation: number;
    fastestOperation: number;
  } {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;
    
    if (filteredMetrics.length === 0) {
      return {
        averageTime: 0,
        successRate: 0,
        totalOperations: 0,
        slowestOperation: 0,
        fastestOperation: 0,
      };
    }
    
    const durations = filteredMetrics.map(m => m.duration);
    const successCount = filteredMetrics.filter(m => m.success).length;
    
    return {
      averageTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      successRate: (successCount / filteredMetrics.length) * 100,
      totalOperations: filteredMetrics.length,
      slowestOperation: Math.max(...durations),
      fastestOperation: Math.min(...durations),
    };
  }
  
  // Get recent performance trends
  static getTrends(hoursBack: number = 24): {
    operation: string;
    trend: 'improving' | 'declining' | 'stable';
    change: number;
  }[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursBack);
    
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp) > cutoff);
    const operationGroups = this.groupMetricsByOperation(recentMetrics);
    
    return Object.entries(operationGroups).map(([operation, metrics]) => {
      const trend = this.calculateTrend(metrics);
      return {
        operation,
        trend: trend.direction,
        change: trend.change,
      };
    });
  }
  
  private static groupMetricsByOperation(metrics: PerformanceMetric[]): Record<string, PerformanceMetric[]> {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetric[]>);
  }
  
  private static calculateTrend(metrics: PerformanceMetric[]): {
    direction: 'improving' | 'declining' | 'stable';
    change: number;
  } {
    if (metrics.length < 2) {
      return { direction: 'stable', change: 0 };
    }
    
    const sorted = metrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const half = Math.floor(sorted.length / 2);
    
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    if (change > 10) direction = 'declining';
    else if (change < -10) direction = 'improving';
    
    return { direction, change };
  }
  
  // Clear metrics (for testing/cleanup)
  static clearMetrics() {
    this.metrics = [];
  }
  
  // Get all metrics (for debugging)
  static getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Search-specific performance tracking
export class SearchPerformanceTracker {
  static trackSearchOperation(query: string, sources: string[]) {
    const endTimer = PerformanceMonitor.startTimer('search_operation');
    
    return {
      trackSourceResult: (source: string, success: boolean, resultCount: number) => {
        PerformanceMonitor.logMetric({
          operation: `search_${source}`,
          duration: performance.now(),
          timestamp: new Date().toISOString(),
          success,
          metadata: {
            query,
            resultCount,
            source,
          },
        });
      },
      
      trackAIProcessing: (success: boolean, tokenCount?: number) => {
        const aiEndTimer = PerformanceMonitor.startTimer('ai_processing');
        return aiEndTimer(success, { query, tokenCount });
      },
      
      complete: (success: boolean, totalResults: number) => {
        return endTimer(success, {
          query,
          sources,
          totalResults,
        });
      },
    };
  }
}

// Error tracking
export class ErrorTracker {
  private static errors: {
    error: Error;
    context: string;
    timestamp: string;
    userId?: string;
  }[] = [];
  
  static trackError(error: Error, context: string, userId?: string) {
    const errorInfo = {
      error,
      context,
      timestamp: new Date().toISOString(),
      userId,
    };
    
    this.errors.push(errorInfo);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🔥 Error in ${context}:`, error);
    }
    
    // Send to error tracking service
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.sendErrorToService(errorInfo);
    }
  }
  
  private static sendErrorToService(errorInfo: any) {
    fetch('/api/analytics/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: errorInfo.error.message,
        stack: errorInfo.error.stack,
        context: errorInfo.context,
        timestamp: errorInfo.timestamp,
        userId: errorInfo.userId,
      }),
    }).catch(() => {
      // Silent fail for error tracking
    });
  }
  
  static getErrorStats(): {
    totalErrors: number;
    errorsByContext: Record<string, number>;
    recentErrors: number;
  } {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentErrors = this.errors.filter(e => new Date(e.timestamp) > hourAgo);
    const errorsByContext = this.errors.reduce((acc, e) => {
      acc[e.context] = (acc[e.context] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalErrors: this.errors.length,
      errorsByContext,
      recentErrors: recentErrors.length,
    };
  }
}

// Rate limiting tracker
export class RateLimitTracker {
  private static limits = new Map<string, {
    count: number;
    resetTime: number;
    limit: number;
  }>();
  
  static checkLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const current = this.limits.get(key);
    
    if (!current || now > current.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
        limit,
      });
      return true;
    }
    
    if (current.count >= limit) {
      return false;
    }
    
    current.count++;
    return true;
  }
  
  static getRemainingRequests(key: string): number {
    const current = this.limits.get(key);
    if (!current) return 0;
    
    return Math.max(0, current.limit - current.count);
  }
  
  static getResetTime(key: string): number {
    const current = this.limits.get(key);
    return current?.resetTime || 0;
  }
}
