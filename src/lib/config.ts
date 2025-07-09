import { envSchema } from './validations';

// Validate environment variables (non-strict for build time)
function validateEnv() {
  try {
    return envSchema.parse({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      BRAVE_RAPIDAPI_KEY: process.env.BRAVE_RAPIDAPI_KEY,
      BRAVE_RAPIDAPI_HOST: process.env.BRAVE_RAPIDAPI_HOST,
      SERPAPI_KEY: process.env.SERPAPI_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      SEARCH_TIMEOUT: process.env.SEARCH_TIMEOUT,
      MAX_RESULTS_PER_SOURCE: process.env.MAX_RESULTS_PER_SOURCE,
      CACHE_DURATION: process.env.CACHE_DURATION,
      USE_SIMPLIFIED_PROMPT: process.env.USE_SIMPLIFIED_PROMPT,
      ENABLE_DETAILED_RESPONSES: process.env.ENABLE_DETAILED_RESPONSES,
      FORCE_COMPREHENSIVE_RESPONSES: process.env.FORCE_COMPREHENSIVE_RESPONSES,
      MIN_RESPONSE_LENGTH: process.env.MIN_RESPONSE_LENGTH,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      GEMINI_MAX_TOKENS: process.env.GEMINI_MAX_TOKENS,
    });
  } catch (error) {
    console.warn('Environment validation warning:', error);
    // Return default values instead of throwing
    return {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      BRAVE_RAPIDAPI_KEY: process.env.BRAVE_RAPIDAPI_KEY || '',
      BRAVE_RAPIDAPI_HOST: process.env.BRAVE_RAPIDAPI_HOST || '',
      SERPAPI_KEY: process.env.SERPAPI_KEY || '',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
      SEARCH_TIMEOUT: 10000,
      MAX_RESULTS_PER_SOURCE: 10,
      CACHE_DURATION: 3600,
      USE_SIMPLIFIED_PROMPT: false,
      ENABLE_DETAILED_RESPONSES: true,
      FORCE_COMPREHENSIVE_RESPONSES: true,
      MIN_RESPONSE_LENGTH: 800,
      GEMINI_MODEL: 'gemini-2.5-pro',
      GEMINI_MAX_TOKENS: 4000,
    };
  }
}

// Only validate environment during build time if we're not in CI
const validatedEnv = validateEnv();

export const config = {
  // API Keys
  geminiApiKey: validatedEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  braveRapidApiKey: validatedEnv.BRAVE_RAPIDAPI_KEY || process.env.BRAVE_RAPIDAPI_KEY || '',
  braveRapidApiHost: validatedEnv.BRAVE_RAPIDAPI_HOST || process.env.BRAVE_RAPIDAPI_HOST || '',
  serpApiKey: validatedEnv.SERPAPI_KEY || process.env.SERPAPI_KEY || '',
  
  // Application
  appUrl: validatedEnv.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'EvaSearchGPT',
  version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
  
  // Performance
  searchTimeout: parseInt(process.env.SEARCH_TIMEOUT || '10000'),
  maxResultsPerSource: parseInt(process.env.MAX_RESULTS_PER_SOURCE || '10'),
  cacheDuration: parseInt(process.env.CACHE_DURATION || '3600'),
  
  // AI configuration
  useSimplifiedPrompt: validatedEnv.USE_SIMPLIFIED_PROMPT || false,
  enableDetailedResponses: validatedEnv.ENABLE_DETAILED_RESPONSES || true,
  forceComprehensiveResponses: validatedEnv.FORCE_COMPREHENSIVE_RESPONSES || true,
  minResponseLength: validatedEnv.MIN_RESPONSE_LENGTH || 800,
  geminiModel: validatedEnv.GEMINI_MODEL || 'gemini-2.5-pro',
  geminiMaxTokens: validatedEnv.GEMINI_MAX_TOKENS || 4000,
  
  // Rate limiting
  rateLimits: {
    brave: { requests: 2000, period: 'month' },
    serpapi: { requests: 100, period: 'month' },
    gemini: { requests: 15, period: 'minute' },
  },
  
  // Feature flags
  features: {
    enableAnalytics: true,
    enableCaching: true,
    enableRateLimiting: true,
    enableErrorTracking: true,
  },
};

// Don't validate during build time to avoid errors
// Runtime validation happens in API routes when needed

export default config;
