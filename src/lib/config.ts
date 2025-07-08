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
