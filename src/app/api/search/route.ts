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

// Artificially cap the number of results to process for reliability
const MAX_RESULTS_TO_PROCESS = 5;

// Set a strict timeout for each external API call
const API_TIMEOUT = 12000; // 12 seconds

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
    
    // ULTRA AGGRESSIVE TIMEOUT HANDLING FOR VERCEL
    const searchTimer = PerformanceMonitor.startTimer('search_api_external_calls');
    
    // Try to get results from any search API that responds within the timeout
    // We'll create a controller for each API call to enforce strict timeouts
    const braveController = new AbortController();
    const serpController = new AbortController();
    
    // Set timeout for each API call
    setTimeout(() => braveController.abort(), API_TIMEOUT);
    setTimeout(() => serpController.abort(), API_TIMEOUT);
    
    // Use a faster fallback strategy - try all APIs but proceed with whatever responds first
    let apiResponses: any[] = [];
    let anySuccessfulSearch = false;
    
    try {
      // Try Brave search with strict timeout
      const bravePromise = searchBrave(query, braveController.signal)
        .then(result => {
          anySuccessfulSearch = true;
          apiResponses.push({
            ...result,
            // Limit results for faster processing
            results: result.results.slice(0, MAX_RESULTS_TO_PROCESS)
          });
          return true;
        })
        .catch(error => {
          console.log('Brave search failed:', error.message);
          return false;
        });
      
      // Try SerpAPI with strict timeout
      const serpPromise = searchSerpAPI(query, serpController.signal)
        .then(result => {
          anySuccessfulSearch = true;
          apiResponses.push({
            ...result,
            // Limit results for faster processing
            results: result.results.slice(0, MAX_RESULTS_TO_PROCESS)
          });
          return true;
        })
        .catch(error => {
          console.log('SerpAPI search failed:', error.message);
          return false;
        });
      
      // Wait for both APIs to respond or timeout
      await Promise.allSettled([bravePromise, serpPromise]);
      
      // If no search APIs responded successfully, create a fallback response
      if (!anySuccessfulSearch) {
        apiResponses = [
          {
            results: [],
            totalResults: 0,
            processingTime: 0,
            source: 'fallback',
            success: false,
            error: 'All search APIs timed out or failed'
          }
        ];
      }
    } catch (searchError) {
      console.error('Search error:', searchError);
      // Continue with empty results if all searches fail
      apiResponses = [
        {
          results: [],
          totalResults: 0,
          processingTime: 0,
          source: 'error',
          success: false,
          error: searchError instanceof Error ? searchError.message : 'Unknown search error'
        }
      ];
    }
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
    
    // Generate AI response with timeout protection
    const aiTimer = PerformanceMonitor.startTimer('search_api_ai_processing');
    
    // Prepare a prompt with limited results to reduce processing time
    const limitedResults = mergedResults.slice(0, MAX_RESULTS_TO_PROCESS);
    const prompt = PromptEngine.generateSearchPrompt({
      query,
      results: limitedResults,
      intent: detectedIntent,
      previousQueries: body.context ? body.context.slice(-1) : undefined, // Only use most recent context
    });
    
    // Set a timeout for AI response generation
    let aiResponse = "I couldn't find specific information about your query due to timing constraints. Please try a more specific question.";
    
    try {
      // Create an abort controller for the AI request
      const aiController = new AbortController();
      const aiTimeout = setTimeout(() => aiController.abort(), 10000); // 10 second timeout for AI
      
      // Get the model with timeout protection
      const model = genAI.getGenerativeModel({ 
        model: geminiModelName,
        generationConfig: {
          maxOutputTokens: 600,  // Limit output size for faster response
          temperature: 0.2       // Lower temperature for more focused response
        }
      });
      
      // Generate content with abort signal
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI generation timed out")), 10000)
        )
      ]);
      
      // Clear the timeout
      clearTimeout(aiTimeout);
      
      // Extract the response text
      // @ts-ignore - We know this is the correct shape from the Gemini API
      if (result && typeof result === 'object' && 'response' in result) {
        // @ts-ignore - We know this is the correct shape from the Gemini API
        const response = await result.response;
        // @ts-ignore - We're handling Gemini API types
        aiResponse = response.text();
      }
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      // Use fallback response if AI generation fails
      aiResponse = `Based on your query about "${query}", I found some relevant information, but couldn't generate a complete response in time. Please try a more specific question.`;
    }
    
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
      answer: aiResponse,
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
