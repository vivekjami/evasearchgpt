import axios from 'axios';
import { SearchResult, SearchApiResponse } from '../types/search';
import config from '../lib/config';

// Rate limiting tracker
const rateLimitTracker = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(source: string): boolean {
  const now = Date.now();
  const limit = config.rateLimits[source as keyof typeof config.rateLimits];
  
  const current = rateLimitTracker.get(source);
  if (!current || now > current.resetTime) {
    rateLimitTracker.set(source, { count: 1, resetTime: now + (limit.period === 'minute' ? 60000 : 2592000000) });
    return true;
  }
  
  if (current.count >= limit.requests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Transform functions for different APIs
interface BraveSearchResult {
  title?: string;
  url?: string;
  link?: string;
  description?: string;
  snippet?: string;
  published_date?: string;
  age?: string;
  date?: string;
  thumbnail?: { src?: string };
  page_rank?: number;
}

function transformBraveResult(result: BraveSearchResult, index: number): SearchResult {
  return {
    id: `brave_${index}_${Date.now()}`,
    title: result.title || 'No title',
    url: result.url || result.link || '',
    snippet: result.description || result.snippet || 'No description available',
    source: 'brave',
    relevanceScore: Math.max(0, Math.min(100, 100 - (index * 3))), // Decreasing relevance
    publishedDate: result.published_date || result.age || result.date,
    imageUrl: result.thumbnail?.src || undefined,
    domain: result.url ? new URL(result.url).hostname : (result.link ? new URL(result.link).hostname : undefined),
  };
}

interface SerpSearchResult {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  thumbnail?: string;
  displayed_link?: string;
}

function transformSerpResult(result: SerpSearchResult, index: number): SearchResult {
  return {
    id: `serp_${index}_${Date.now()}`,
    title: result.title || 'No title',
    url: result.link || '',
    snippet: result.snippet || 'No description available',
    source: 'serpapi',
    relevanceScore: Math.max(0, Math.min(100, 100 - (index * 5))), // Decreasing relevance
    publishedDate: result.date,
    imageUrl: result.thumbnail,
    domain: result.displayed_link || (result.link ? new URL(result.link).hostname : undefined),
  };
}

// Bing transform function removed as Bing search is not available

// Brave Search API via RapidAPI
export async function searchBrave(query: string, signal?: AbortSignal): Promise<SearchApiResponse> {
  const startTime = Date.now();
  
  try {
    if (!checkRateLimit('brave')) {
      throw new Error('Rate limit exceeded for Brave Search');
    }

    const response = await axios.get(`https://${config.braveRapidApiHost}/search`, {
      params: {
        q: query,
        count: Math.min(config.maxResultsPerSource, 5), // Limit results for faster response
      },
      headers: {
        'x-rapidapi-host': config.braveRapidApiHost,
        'x-rapidapi-key': config.braveRapidApiKey,
        'User-Agent': 'EvaSearchGPT/1.0',
      },
      timeout: 12000, // Hard-coded shorter timeout for reliability
      signal: signal, // Support for AbortController
    });

    const results = response.data.results || response.data.web?.results || [];
    const transformedResults = results.map(transformBraveResult);

    return {
      results: transformedResults,
      totalResults: response.data.total_results || response.data.web?.totalResults || results.length,
      processingTime: Date.now() - startTime,
      source: 'brave',
      success: true,
    };
  } catch (error) {
    console.error('Brave Search error:', error);
    return {
      results: [],
      totalResults: 0,
      processingTime: Date.now() - startTime,
      source: 'brave',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// SerpAPI Search
export async function searchSerpAPI(query: string, signal?: AbortSignal): Promise<SearchApiResponse> {
  const startTime = Date.now();
  
  try {
    if (!checkRateLimit('serpapi')) {
      throw new Error('Rate limit exceeded for SerpAPI');
    }

    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: query,
        engine: 'google',
        api_key: config.serpApiKey,
        num: Math.min(config.maxResultsPerSource, 5), // Limit results for faster response
        hl: 'en',
        gl: 'us',
        safe: 'active',
      },
      timeout: 12000, // Hard-coded shorter timeout for reliability
      signal: signal, // Support for AbortController
    });

    const results = response.data.organic_results || [];
    const transformedResults = results.map(transformSerpResult);

    return {
      results: transformedResults,
      totalResults: response.data.search_information?.total_results || 0,
      processingTime: Date.now() - startTime,
      source: 'serpapi',
      success: true,
    };
  } catch (error) {
    console.error('SerpAPI error:', error);
    return {
      results: [],
      totalResults: 0,
      processingTime: Date.now() - startTime,
      source: 'serpapi',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Bing Search API has been removed as it's not available

// The executeAllSearches function has been moved directly into the route file
