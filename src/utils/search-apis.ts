import axios from 'axios';
import { SearchResult, SearchApiResponse } from '@/types/search';
import config from '@/lib/config';

// Rate limiting tracker
const rateLimitTracker = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(source: string): boolean {
  const now = Date.now();
  const limit = config.rateLimits[source as keyof typeof config.rateLimits];
  const key = `${source}_${now}`;
  
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
function transformBraveResult(result: any, index: number): SearchResult {
  return {
    id: `brave_${index}_${Date.now()}`,
    title: result.title || 'No title',
    url: result.url || '',
    snippet: result.description || result.snippet || 'No description available',
    source: 'brave',
    relevanceScore: Math.max(0, Math.min(100, (result.page_rank || 50) * 2)),
    publishedDate: result.published_date || result.age,
    imageUrl: result.thumbnail?.src,
    domain: result.url ? new URL(result.url).hostname : undefined,
  };
}

function transformSerpResult(result: any, index: number): SearchResult {
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

function transformBingResult(result: any, index: number): SearchResult {
  return {
    id: `bing_${index}_${Date.now()}`,
    title: result.name || 'No title',
    url: result.url || '',
    snippet: result.snippet || 'No description available',
    source: 'bing',
    relevanceScore: Math.max(0, Math.min(100, 100 - (index * 3))), // Decreasing relevance
    publishedDate: result.datePublished,
    imageUrl: result.thumbnailUrl,
    domain: result.displayUrl || (result.url ? new URL(result.url).hostname : undefined),
  };
}

// Brave Search API
export async function searchBrave(query: string): Promise<SearchApiResponse> {
  const startTime = Date.now();
  
  try {
    if (!checkRateLimit('brave')) {
      throw new Error('Rate limit exceeded for Brave Search');
    }

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: config.maxResultsPerSource,
        search_lang: 'en',
        country: 'US',
        safesearch: 'moderate',
        freshness: 'all',
      },
      headers: {
        'X-Subscription-Token': config.braveApiKey,
        'Accept': 'application/json',
        'User-Agent': 'EvaSearchGPT/1.0',
      },
      timeout: config.searchTimeout,
    });

    const results = response.data.web?.results || [];
    const transformedResults = results.map(transformBraveResult);

    return {
      results: transformedResults,
      totalResults: response.data.web?.totalResults || 0,
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
export async function searchSerpAPI(query: string): Promise<SearchApiResponse> {
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
        num: config.maxResultsPerSource,
        hl: 'en',
        gl: 'us',
        safe: 'active',
      },
      timeout: config.searchTimeout,
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

// Bing Search API
export async function searchBing(query: string): Promise<SearchApiResponse> {
  const startTime = Date.now();
  
  try {
    if (!checkRateLimit('bing')) {
      throw new Error('Rate limit exceeded for Bing Search');
    }

    const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
      params: {
        q: query,
        count: config.maxResultsPerSource,
        offset: 0,
        mkt: 'en-US',
        safeSearch: 'Moderate',
        responseFilter: 'Webpages',
        freshness: 'Day',
      },
      headers: {
        'Ocp-Apim-Subscription-Key': config.bingApiKey,
        'User-Agent': 'EvaSearchGPT/1.0',
      },
      timeout: config.searchTimeout,
    });

    const results = response.data.webPages?.value || [];
    const transformedResults = results.map(transformBingResult);

    return {
      results: transformedResults,
      totalResults: response.data.webPages?.totalEstimatedMatches || 0,
      processingTime: Date.now() - startTime,
      source: 'bing',
      success: true,
    };
  } catch (error) {
    console.error('Bing Search error:', error);
    return {
      results: [],
      totalResults: 0,
      processingTime: Date.now() - startTime,
      source: 'bing',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute all searches in parallel
export async function executeAllSearches(query: string): Promise<SearchApiResponse[]> {
  const searchPromises = [
    searchBrave(query),
    searchSerpAPI(query),
    searchBing(query),
  ];

  const results = await Promise.allSettled(searchPromises);
  
  return results.map(result => 
    result.status === 'fulfilled' ? result.value : {
      results: [],
      totalResults: 0,
      processingTime: 0,
      source: 'unknown',
      success: false,
      error: result.reason?.message || 'Search failed',
    }
  );
}
