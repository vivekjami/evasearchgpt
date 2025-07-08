import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchBrave, searchSerpAPI } from '@/utils/search-apis';
import { mergeSearchResults, assessResultQuality } from '@/utils/result-merger';
import { PromptEngine, QueryIntent } from '@/utils/prompt-engine';
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
const API_TIMEOUT = 24000; // 24 seconds (doubled for better reliability)

export async function POST(request: NextRequest) {
  const perfTimer = PerformanceMonitor.startTimer('search_api_total');
  
  // Define variables at the top level so they're available in catch block
  let query = '';
  let apiResponses: any[] = [];
  let mergedResults: any[] = [];
  let detectedIntent: QueryIntent = 'general';
  let quality = { quality: 'medium', confidence: 50 };
  
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
    query = validatedQuery.query;
    
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
    apiResponses = [];
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
    
    // Generate AI response with simplified, more direct approach
    const aiTimer = PerformanceMonitor.startTimer('search_api_ai_processing');
    
    // Prepare a prompt with limited results to reduce processing time
    const limitedResults = mergedResults.slice(0, MAX_RESULTS_TO_PROCESS);
    
    // Create a simplified, direct prompt
    const sourcesText = limitedResults.map((result, index) => {
      return `Source ${index + 1}: ${result.title}
URL: ${result.url}
${result.snippet}
${result.publishedDate ? `Published: ${result.publishedDate}` : ''}
---`;
    }).join('\n\n');
    
    const directPrompt = `Answer the following query based on the provided sources:
    
Query: "${query}"

Sources:
${sourcesText}

Instructions:
1. Directly answer the query using information from the sources
2. Synthesize the information into a coherent, comprehensive answer
3. Cite sources using [1], [2], etc.
4. If sources don't contain enough information, clearly state what is based on your general knowledge
5. Write in a clear, helpful tone
6. Provide a complete answer - don't leave information out!

Your response should be at least 150 words.`;
    
    // Set a timeout for AI response generation
    let aiResponse = "I couldn't find specific information about your query due to timing constraints. Please try a more specific question.";
    
    try {
      // Get the model with simplified configuration
      const model = genAI.getGenerativeModel({ 
        model: geminiModelName,
        generationConfig: {
          maxOutputTokens: 1000,  // Increased token limit for more comprehensive responses
          temperature: 0.3,       // Balanced between creative and factual
          topP: 0.95,             // High probability mass
          topK: 40                // Diverse token selection
        }
      });
      
      console.log("Sending request to Gemini API...");
      
      // Direct approach without extra Promise wrappers
      try {
        // First attempt with complete request
        const result = await model.generateContent(directPrompt);
        const response = await result.response;
        aiResponse = response.text();
        console.log("Gemini API response received successfully.");
      } catch (initialError) {
        console.error("Initial Gemini API call failed:", initialError);
        
        // Fallback to a simpler prompt if the first attempt fails
        try {
          const simplifiedPrompt = `Answer this question: "${query}" based on these snippets:\n\n${limitedResults.map(r => r.snippet).join('\n\n')}`;
          const fallbackResult = await model.generateContent(simplifiedPrompt);
          const fallbackResponse = await fallbackResult.response;
          aiResponse = fallbackResponse.text();
          console.log("Fallback Gemini API response received.");
        } catch (fallbackError) {
          console.error("Fallback Gemini API call also failed:", fallbackError);
          aiResponse = `Based on the search results about "${query}", here are some key points:
          
- ${limitedResults[0]?.title || 'Recent research'}
- ${limitedResults[1]?.title || 'New developments'}
- ${limitedResults[2]?.title || 'Important findings'}

For more details, please check the sources provided and try a more specific question.`;
        }
      }
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      // Use fallback response if AI generation fails
      aiResponse = `Based on your query about "${query}", I found some relevant information in the search results, but couldn't generate a complete AI response. Please check the sources provided below for information about ${query}.`;
    }
    
    aiTimer(true);
    
    // Generate follow-up questions based on the query and results
    // Use the PromptEngine to generate more relevant follow-up questions
    const followUpQuestions = PromptEngine.generateFollowUpQuestions(
      query,
      limitedResults, 
      detectedIntent
    );
    
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
    
    // Add more detailed logging
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
    }
    
    // Capture current state for diagnostics
    const diagnosticInfo = {
      queryLength: typeof query === 'string' ? query.length : 0,
      apiResponsesReceived: Array.isArray(apiResponses) ? apiResponses.length : 0,
      mergedResultsCount: Array.isArray(mergedResults) ? mergedResults.length : 0,
      sourcesSuccessful: Array.isArray(apiResponses) 
        ? apiResponses.filter((r: any) => r.success).length 
        : 0,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
    
    console.error('Diagnostic information:', diagnosticInfo);
    
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
    
    // Check for AI generation errors
    if (errorDetails.includes('generate') || errorDetails.includes('AI') || errorDetails.includes('Gemini')) {
      errorMessage = 'AI response generation failed';
      errorDetails = 'The AI model failed to generate a response. Search results are available but couldn\'t be synthesized into an answer.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails,
        timestamp: new Date().toISOString(),
        diagnostics: diagnosticInfo
      },
      { status: statusCode }
    );
  }
}
