export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: 'brave' | 'serpapi';
  relevanceScore: number;
  publishedDate?: string;
  imageUrl?: string;
  domain?: string;
}

export interface SearchQuery {
  query: string;
  intent: 'research' | 'shopping' | 'news' | 'technical' | 'general';
  context?: string[];
  filters?: {
    timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
    language?: string;
    region?: string;
  };
}

export interface AIResponse {
  answer: string;
  sources: SearchResult[];
  followUpQuestions: string[];
  confidence: number;
  processingTime: number;
  queryIntent: string;
}

export interface SearchPerformance {
  totalTime: number;
  searchTime: number;
  aiProcessingTime: number;
  sourceCount: number;
  successRate: number;
}

export interface SearchApiResponse {
  results: SearchResult[];
  totalResults: number;
  processingTime: number;
  source: string;
  success: boolean;
  error?: string;
}
