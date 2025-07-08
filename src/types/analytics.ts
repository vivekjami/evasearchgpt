export interface AnalyticsData {
  totalSearches: number;
  avgResponseTime: number;
  successRate: number;
  topQueries: QueryStats[];
  sourcePerformance: SourceStats[];
  userEngagement: EngagementStats;
  timeSeriesData: TimeSeriesPoint[];
}

export interface QueryStats {
  query: string;
  count: number;
  avgResponseTime: number;
  avgConfidence: number;
  successRate: number;
}

export interface SourceStats {
  source: string;
  totalQueries: number;
  avgResponseTime: number;
  successRate: number;
  avgRelevanceScore: number;
}

export interface EngagementStats {
  avgSessionDuration: number;
  avgQueriesPerSession: number;
  followUpClickRate: number;
  returnUserRate: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  searches: number;
  responseTime: number;
  successRate: number;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, any>;
}
