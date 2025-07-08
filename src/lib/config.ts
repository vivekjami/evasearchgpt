import { envSchema } from './validations';

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      BRAVE_API_KEY: process.env.BRAVE_API_KEY,
      SERPAPI_KEY: process.env.SERPAPI_KEY,
      BING_API_KEY: process.env.BING_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      SEARCH_TIMEOUT: process.env.SEARCH_TIMEOUT,
      MAX_RESULTS_PER_SOURCE: process.env.MAX_RESULTS_PER_SOURCE,
      CACHE_DURATION: process.env.CACHE_DURATION,
    });
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

export const config = {
  // API Keys
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  braveApiKey: process.env.BRAVE_API_KEY || '',
  serpApiKey: process.env.SERPAPI_KEY || '',
  bingApiKey: process.env.BING_API_KEY || '',
  
  // Application
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
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
    bing: { requests: 1000, period: 'month' },
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

// Validate configuration in production
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

export default config;
