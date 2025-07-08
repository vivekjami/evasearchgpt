import { SearchResult } from './search';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: SearchResult[];
  followUpQuestions?: string[];
  confidence?: number;
  processingTime?: number;
  queryIntent?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  totalQueries: number;
  averageResponseTime: number;
}

export interface ChatContext {
  previousQueries: string[];
  currentTopic?: string;
  userPreferences?: {
    preferredSources?: string[];
    language?: string;
    complexity?: 'simple' | 'detailed' | 'expert';
  };
}
