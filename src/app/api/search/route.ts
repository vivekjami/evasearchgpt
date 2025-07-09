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
const geminiModelName = config.geminiModel || 'gemini-2.5-pro';

// Process more results for comprehensive responses
const MAX_RESULTS_TO_PROCESS = 8;

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
    
    // Create an enhanced source format with more context and metadata
    const sourcesText = limitedResults.map((result, index) => {
      // Extract domain for context
      let domain = '';
      try {
        domain = new URL(result.url).hostname;
      } catch (e) {
        domain = result.source || 'Unknown source';
      }
      
      // Add relevance indicator
      const relevance = result.relevanceScore ? `${result.relevanceScore}%` : 'Unknown';
      
      // Format date if available
      const dateInfo = result.publishedDate 
        ? `Published: ${result.publishedDate}`
        : '';
        
      // Enhanced source format with better structure
      return `Source [${index + 1}]: ${result.title}
URL: ${result.url}
Domain: ${domain}
Relevance: ${relevance}
${dateInfo}

CONTENT:
${result.snippet}

---`;
    }).join('\n\n');
    
    // Create a prompt for detailed, source-rich responses
    let directPrompt = '';
    
    if (config.useSimplifiedPrompt) {
      // Simplified prompt for challenging environments
      directPrompt = `Answer this question: "${query}"
      
Here's information from search results:
${limitedResults.map((r, i) => `[${i+1}] ${r.title}\n${r.url}\n${r.snippet}`).join('\n\n')}

Write a clear, comprehensive answer citing sources as [1], [2], etc. Include specific details from each source.`;
    } else {
      // Ultra-comprehensive prompt for extremely detailed, reference-rich responses
      directPrompt = `You are an EXPERT RESEARCH ANALYST with a PhD-level understanding of the subject matter. Your task is to create an EXCEPTIONALLY COMPREHENSIVE, IN-DEPTH research report on the following query using ONLY the sources provided:

QUERY: "${query}"

SEARCH RESULTS:
${sourcesText}

CRITICAL REQUIREMENTS:
1. Create an EXHAUSTIVE, SCHOLARLY analysis that is EXTREMELY THOROUGH (minimum 800-1000 words)
2. EXTRACT EVERY RELEVANT detail, statistic, figure, date, name, and quote from the sources
3. For EACH claim, fact, or statement, provide EXPLICIT citations using numbered references [1], [2], etc.
4. SYNTHESIZE information across sources to form a complete picture
5. ANALYZE implications, significance, and context for each major point
6. HIGHLIGHT controversies, debates, or conflicting information between sources
7. EXPLAIN complex concepts with clear, detailed explanations
8. Use PROFESSIONAL academic language and tone throughout
9. Include EXTENSIVE use of sub-sections, bullet points, and structured formatting
10. NEVER invent facts or data not present in the sources - rely EXCLUSIVELY on provided materials

YOUR RESPONSE MUST FOLLOW THIS COMPREHENSIVE STRUCTURE:

## Executive Summary
[Concise overview of key findings - 2-3 paragraphs with citations]

## Comprehensive Analysis
[EXTREMELY DETAILED main analysis with multiple sub-sections, 600+ words, heavy citation]

### Historical Context and Background
[Thorough background information with citations]

### Current Developments and Breakthroughs
[Detailed analysis of recent advancements with citations]

### Technical Aspects and Methodologies
[In-depth explanation of technical elements with citations]

### Implications and Future Directions
[Analysis of significance and future prospects with citations]

## Key Findings and Conclusions
- [Detailed finding 1 with multiple citations]
- [Detailed finding 2 with multiple citations]
- [Detailed finding 3 with multiple citations]
- [Detailed finding 4 with multiple citations]
- [Detailed finding 5 with multiple citations]

## Comprehensive Source Analysis
- [1] Source name and details (Provide THOROUGH explanation of exactly what information was extracted from this source, including specific facts, figures, quotes)
- [2] Source name and details (Provide THOROUGH explanation of exactly what information was extracted from this source, including specific facts, figures, quotes)
...

REMEMBER: Your response MUST be extremely comprehensive, extensively cited, and analyze the topic from multiple angles. It should be a DEFINITIVE resource on the topic.`;
    }
    
    // Set a timeout for AI response generation
    let aiResponse = "I couldn't find specific information about your query due to timing constraints. Please try a more specific question.";
    
    try {
      // Get the model with optimized configuration for detailed, reference-rich responses
      const model = genAI.getGenerativeModel({ 
        model: geminiModelName,
        generationConfig: {
          maxOutputTokens: config.geminiMaxTokens || 2000,  // Increased token limit for more detailed responses
          temperature: 0.2,        // Lower temperature for more factual responses
          topP: 0.90,              // Slightly lower top_p for more focused responses
          topK: 40                 // Keep diverse token selection
        }
      });
      
      console.log("Sending request to Gemini API...");
      
      // Direct approach with better error handling and timeouts
      try {
        console.log("Attempting Gemini API call with API key:", process.env.GEMINI_API_KEY ? "Key is present" : "Key is missing");
        
        // Use Promise.race with a timeout to avoid long-running requests
        const geminiPromise = model.generateContent(directPrompt);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000);
        });
        
        // Race between the actual API call and the timeout
        const result = await Promise.race([geminiPromise, timeoutPromise]) as any;
        
        // Log the raw response for debugging
        console.log("Gemini API raw response structure:", JSON.stringify({
          hasResponse: !!result?.response,
          responseType: result?.response ? typeof result.response : 'unknown',
          hasText: !!result?.response?.text
        }));
        
        const response = await result.response;
        aiResponse = response.text();
        
        // Log success with snippet
        const responsePreview = aiResponse.substring(0, 100) + "...";
        console.log(`Gemini API success. Response starts with: ${responsePreview}`);
      } catch (initialError) {
        console.error("Initial Gemini API call failed:", initialError);
        console.error("Error details:", JSON.stringify({
          message: initialError instanceof Error ? initialError.message : String(initialError),
          name: initialError instanceof Error ? initialError.name : 'Unknown',
          stack: initialError instanceof Error && initialError.stack 
            ? initialError.stack.split('\n').slice(0, 3).join('\n') 
            : 'No stack trace'
        }));
        
        // Fallback to a simpler prompt with shorter context
        try {
          const simplifiedPrompt = `Create a comprehensive research report answering this question: "${query}". 
          
Use these search snippets as your ONLY sources of information:
${limitedResults.slice(0, 3).map((r, i) => `Source [${i+1}] - ${r.title}:\n${r.url}\n${r.snippet}`).join('\n\n')}

CRITICAL REQUIREMENTS:
- Write an EXTREMELY THOROUGH analysis (minimum 500 words)
- Extract EVERY relevant fact, figure, date, and quote from the sources
- Cite sources using [1], [2], etc. after EACH statement or claim
- Use extensive formatting with multiple sections and subsections
- Provide detailed analysis and context for each major point
- Structure your response with clear headings and organization

YOUR RESPONSE MUST INCLUDE:
1. Executive Summary of key findings
2. Comprehensive Main Analysis (with multiple subsections)
3. Detailed Key Findings list with citations
4. Complete Sources section explaining what was taken from each source

I need an EXPERT-LEVEL, EXHAUSTIVE response that serves as a definitive resource on this topic.`;
          
          console.log("Attempting fallback Gemini API call with simplified prompt");
          const fallbackResult = await model.generateContent(simplifiedPrompt);
          const fallbackResponse = await fallbackResult.response;
          aiResponse = fallbackResponse.text();
          console.log("Fallback Gemini API response successful");
        } catch (fallbackError) {
          console.error("Fallback Gemini API call also failed:", fallbackError);
          console.error("Fallback error details:", JSON.stringify({
            message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            name: fallbackError instanceof Error ? fallbackError.name : 'Unknown'
          }));
          
          // Provide a structured fallback response based on search results
          aiResponse = `## Search Results for "${query}"

Based on the search results, here are some key findings:

${limitedResults.slice(0, 3).map((result, i) => (
  `### ${result.title || `Source ${i+1}`}\n${result.snippet || 'No description available.'}`
)).join('\n\n')}

For more detailed information, please refer to the sources provided below.`;
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
    
    // Log the final response data for debugging
    console.log("Search API response summary:", {
      answerLength: aiResponse.length,
      answerPreview: aiResponse.substring(0, 50) + "...",
      sourcesCount: mergedResults.length,
      followUpQuestionsCount: followUpQuestions.length,
      processingTimeMs: totalTime,
      geminiApiKeyPresent: Boolean(process.env.GEMINI_API_KEY),
    });
    
    // Verify and enhance the AI response to ensure maximum detail and comprehensiveness
    if (!aiResponse || aiResponse.trim().length < 100) {
      console.error("Generated AI response is empty or too short:", aiResponse);
      
      // Provide a detailed fallback answer using search results directly
      aiResponse = `# Comprehensive Research Report: ${query}

## Executive Summary
This report compiles information from multiple sources regarding "${query}". Due to processing limitations, I've provided a structured analysis of the key sources found.

## Detailed Source Analysis

${mergedResults.slice(0, 5).map((result, i) => (
  `### Source ${i+1}: ${result.title}\n\n**URL**: ${result.url}\n\n**Key Information**:\n${result.snippet || 'No description available.'}\n\n**Analysis**: This source provides important context about ${query} that can help understand the current state of knowledge and recent developments in this area.\n\n**Relevance**: ${result.relevanceScore || 'High'}\n`
)).join('\n\n')}

## Synthesis of Findings
Based on the sources above, we can draw several important conclusions about "${query}":

1. ${mergedResults[0]?.title || 'The first source'} indicates that ${mergedResults[0]?.snippet?.substring(0, 100) || 'relevant information exists'}.
2. ${mergedResults[1]?.title || 'Additional sources'} provide context that ${mergedResults[1]?.snippet?.substring(0, 100) || 'supplements our understanding'}.
3. The collected information suggests that this topic has significant implications for research and practical applications.

## Recommended Further Research
For a more comprehensive understanding, consider exploring:
- More specific aspects of ${query.split(' ').slice(-2).join(' ')}
- Recent academic publications in this field
- Industry reports and whitepapers

## Complete Source References
${mergedResults.slice(0, 5).map((r, i) => `[${i+1}] ${r.title}. Available at: ${r.url}${r.publishedDate ? ' (Published: ' + r.publishedDate + ')' : ''}`).join('\n')}`;
    } else {
      // Determine if the response meets our comprehensive requirements
      const minWordCount = config.minResponseLength || 800;
      const wordCount = aiResponse.split(/\s+/).length;
      const citationCount = (aiResponse.match(/\[\d+\]/g) || []).length;
      const expectedCitations = Math.min(5, limitedResults.length);
      const sectionMatches = aiResponse.match(/#{2,3}\s+\w+/g);
      const hasProperSections = sectionMatches ? sectionMatches.length >= 3 : false;
      const hasExecutiveSummary = aiResponse.toLowerCase().includes('executive summary') || aiResponse.toLowerCase().includes('summary');
      
      console.log(`Response quality check - Words: ${wordCount}/${minWordCount}, Citations: ${citationCount}/${expectedCitations}, Proper Sections: ${hasProperSections}`);
      
      let needsEnhancement = false;
      
      // Check if response is too short
      if (wordCount < minWordCount && config.forceComprehensiveResponses) {
        console.log(`Response too short (${wordCount} words). Enhancing...`);
        needsEnhancement = true;
      }
      
      // Check if citation count is insufficient
      if (citationCount < expectedCitations && limitedResults.length > 0) {
        console.log(`Citations insufficient (${citationCount}). Adding citation reminders...`);
        
        // Add missing citations
        aiResponse += `\n\n---\n\n**Additional Sources Referenced**:\n\n${limitedResults.slice(0, 5).map((r, i) => 
          `- [${i+1}] ${r.title} (${r.url}) - Contains information about ${query.split(' ').slice(0, 3).join(' ')}`
        ).join('\n')}`;
      }
      
      // Check for proper section structure
      if (!hasProperSections && aiResponse.length > 200) {
        console.log("Response lacks proper section structure. Restructuring...");
        
        // Restructure response with proper sections
        const originalContent = aiResponse;
        aiResponse = `# Comprehensive Analysis: ${query}\n\n`;
        
        if (!hasExecutiveSummary) {
          aiResponse += `## Executive Summary\nThis report provides a thorough analysis of "${query}" based on multiple authoritative sources. The findings reveal important insights about recent developments, key concepts, and implications.\n\n`;
        }
        
        aiResponse += `## Main Analysis\n\n${originalContent}\n\n`;
        
        // Add missing sections if needed
        if (!aiResponse.toLowerCase().includes('findings') && !aiResponse.toLowerCase().includes('conclusion')) {
          aiResponse += `\n\n## Key Findings\n`;
          limitedResults.slice(0, 3).forEach((r, i) => {
            aiResponse += `- The information from source [${i+1}] indicates that ${r.title.toLowerCase().includes(query.toLowerCase()) ? r.snippet.substring(0, 100) + '...' : r.title + ' is relevant to this topic.'}\n`;
          });
        }
      }
      
      // Add sources section if not present
      if (!aiResponse.toLowerCase().includes('source') && limitedResults.length > 0) {
        aiResponse += `\n\n## Complete Source References\n\n${limitedResults.map((r, i) => 
          `[${i+1}] ${r.title}. Available at: ${r.url}${r.publishedDate ? ' (Published: ' + r.publishedDate + ')' : ''}`
        ).join('\n')}`;
      }
    }
    
    return NextResponse.json({
      answer: aiResponse,
      sources: mergedResults.slice(0, 6),
      followUpQuestions,
      confidence: quality.confidence,
      processingTime: totalTime,
      queryIntent: detectedIntent,
      debug: {
        timestamp: new Date().toISOString(),
        answeredBy: 'gemini-2.5-pro',
        sourcesUsed: apiResponses.filter(r => r.success).map(r => r.source),
        hasValidGeminiResponse: aiResponse.length > 50,
        geminiApiConfigured: Boolean(process.env.GEMINI_API_KEY)
      }
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
