import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchBrave, searchSerpAPI } from '@/utils/search-apis';
import { mergeSearchResults, assessResultQuality } from '@/utils/result-merger';
import { PromptEngine } from '@/utils/prompt-engine';
import { searchQuerySchema, runtimeEnvSchema } from '@/lib/validations';
import config from '@/lib/config';
import { PerformanceMonitor } from '@/utils/performance-monitor';

// Validate runtime environment (only when API is called)
function validateRuntimeEnv() {
  try {
    return runtimeEnvSchema.parse({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      BRAVE_RAPIDAPI_KEY: process.env.BRAVE_RAPIDAPI_KEY,
      BRAVE_RAPIDAPI_HOST: process.env.BRAVE_RAPIDAPI_HOST,
      SERPAPI_KEY: process.env.SERPAPI_KEY,
    });
  } catch (error) {
    console.error('Runtime environment validation failed:', error);
    throw new Error('Missing required API keys. Please check your environment configuration.');
  }
}

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const geminiModelName = 'gemini-2.5-pro'; // Updated model name

export async function POST(request: NextRequest) {
  const perfTimer = PerformanceMonitor.startTimer('search_api_total');
  
  try {
    // Validate runtime environment
    validateRuntimeEnv();
    
    // Parse request body
    const body = await request.json();
    
    // Check for missing query before validation
    if (!body.query || body.query.trim() === '') {
      return NextResponse.json(
        { error: 'Search query cannot be empty' },
        { status: 400 }
      );
    }
    
    // Validate query
    const validatedQuery = searchQuerySchema.parse(body);
    const { query } = validatedQuery;
    
    // Execute searches in parallel with individual timeouts
    const searchTimer = PerformanceMonitor.startTimer('search_api_external_calls');
    
    // Create a timeout promise for each search
    const timeoutDuration = config.searchTimeout;
    const createTimeoutPromise = (source: string) => {
      return new Promise<any>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Search timed out for ${source}`));
        }, timeoutDuration);
      });
    };
    
    // Execute searches with individual timeouts
    const braveSearchPromise = Promise.race([
      searchBrave(query),
      createTimeoutPromise('Brave')
    ]).catch(error => ({
      results: [],
      totalResults: 0,
      processingTime: 0,
      source: 'brave',
      success: false,
      error: error.message || 'Brave search failed',
    }));
    
    const serpSearchPromise = Promise.race([
      searchSerpAPI(query),
      createTimeoutPromise('SerpAPI')
    ]).catch(error => ({
      results: [],
      totalResults: 0,
      processingTime: 0,
      source: 'serpapi',
      success: false,
      error: error.message || 'SerpAPI search failed',
    }));
    
    // Use Promise.allSettled to handle both promises
    const searchPromises = [braveSearchPromise, serpSearchPromise];
    const responses = await Promise.allSettled(searchPromises);
    
    // Process responses
    const apiResponses = responses.map(result => 
      result.status === 'fulfilled' ? result.value : {
        results: [],
        totalResults: 0,
        processingTime: 0,
        source: 'unknown',
        success: false,
        error: result.reason?.message || 'Search failed',
      }
    );
    searchTimer(true, { sourcesCount: apiResponses.length });
    
    // Merge and deduplicate results
    const mergeTimer = PerformanceMonitor.startTimer('search_api_merge_results');
    const mergedResults = mergeSearchResults(apiResponses);
    mergeTimer(true, { resultsCount: mergedResults.length });
    
    // Assess result quality
    const quality = assessResultQuality(mergedResults);
    
    // Detect intent and generate prompt
    const intentTimer = PerformanceMonitor.startTimer('search_api_intent_detection');
    const detectedIntent = PromptEngine.detectQueryIntent(query);
    intentTimer(true, { detectedIntent });
    
    // Generate AI response
    const aiTimer = PerformanceMonitor.startTimer('search_api_ai_processing');
    const prompt = PromptEngine.generateSearchPrompt({
      query,
      results: mergedResults,
      intent: detectedIntent,
      previousQueries: body.context,
    });
    
    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    aiTimer(true);
    
    // Generate follow-up questions based on the query and results
    const followUpQuestions = [
      `What are the latest developments in ${query}?`,
      `How does ${query} compare to alternatives?`,
      `What are the practical applications of ${query}?`
    ];
    
    // Calculate total time and return response
    const totalTime = perfTimer(true, {
      resultsCount: mergedResults.length,
      sourcesUsed: apiResponses.filter(r => r.success).length,
      quality: quality.quality,
    });
    
    return NextResponse.json({
      answer: response.text(),
      sources: mergedResults.slice(0, 6),
      followUpQuestions,
      confidence: quality.confidence,
      processingTime: totalTime,
      queryIntent: detectedIntent,
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    perfTimer(false, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // More detailed error messaging based on the type of error
    let statusCode = 500;
    let errorMessage = 'Search failed';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for timeout errors specifically
    if (errorDetails.includes('timeout') || errorDetails.includes('timed out')) {
      statusCode = 504;
      errorMessage = 'Search request timed out';
      errorDetails = 'The search APIs took too long to respond. Try again with a simpler query or check if the search services are experiencing high load.';
    }
    
    // Check for missing API keys
    if (errorDetails.includes('API key') || errorDetails.includes('required API keys')) {
      statusCode = 500;
      errorMessage = 'API configuration error';
      errorDetails = 'Missing or invalid API keys. Please check the environment configuration.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}
