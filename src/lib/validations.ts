import { z } from 'zod';

// Environment validation schema
export const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  BRAVE_RAPIDAPI_KEY: z.string().optional(), 
  BRAVE_RAPIDAPI_HOST: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  SEARCH_TIMEOUT: z.string().transform(Number).default('10000'),
  MAX_RESULTS_PER_SOURCE: z.string().transform(Number).default('10'),
  CACHE_DURATION: z.string().transform(Number).default('3600'),
  USE_SIMPLIFIED_PROMPT: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).default(false),
  ENABLE_DETAILED_RESPONSES: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).default(true),
  FORCE_COMPREHENSIVE_RESPONSES: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).default(true),
  MIN_RESPONSE_LENGTH: z.union([
    z.string().transform(Number),
    z.number()
  ]).default(800),
  GEMINI_MODEL: z.string().default('gemini-2.5-pro'),
  GEMINI_MAX_TOKENS: z.union([
    z.string().transform(Number),
    z.number()
  ]).default(4000),
});

// Runtime API validation (stricter validation for API routes)
export const runtimeEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'Gemini API key is required'),
  BRAVE_RAPIDAPI_KEY: z.string().min(1, 'Brave RapidAPI key is required'),
  BRAVE_RAPIDAPI_HOST: z.string().min(1, 'Brave RapidAPI host is required'),
  SERPAPI_KEY: z.string().min(1, 'SerpAPI key is required'),
});

// Search query validation
export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  intent: z.enum(['research', 'shopping', 'news', 'technical', 'general']).optional(),
  context: z.array(z.string()).optional(),
  filters: z.object({
    timeRange: z.enum(['day', 'week', 'month', 'year', 'all']).optional(),
    language: z.string().optional(),
    region: z.string().optional(),
  }).optional(),
});

// API response validation
export const searchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  source: z.enum(['brave', 'serpapi']),
  relevanceScore: z.number().min(0).max(100),
  publishedDate: z.string().optional(),
  imageUrl: z.string().url().optional(),
  domain: z.string().optional(),
});

export const aiResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(searchResultSchema),
  followUpQuestions: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  processingTime: z.number(),
  queryIntent: z.string(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type SearchResultValidated = z.infer<typeof searchResultSchema>;
export type AIResponseValidated = z.infer<typeof aiResponseSchema>;
