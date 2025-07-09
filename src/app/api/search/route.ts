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
      directPrompt = `You are a FRIENDLY, KNOWLEDGEABLE EXPERT with a PhD-level understanding of the subject matter. Your task is to create a CONVERSATIONAL yet COMPREHENSIVE answer to the following query using ONLY the sources provided:

QUERY: "${query}"

SEARCH RESULTS:
${sourcesText}

CRITICAL REQUIREMENTS:
1. Start with a FRIENDLY, CONVERSATIONAL summary written in HUMAN-LIKE language (approx. 150-200 words)
2. Then provide an EXCEPTIONALLY COMPREHENSIVE, IN-DEPTH research report (minimum 800-1000 words total)
3. For EACH claim, fact, or statement, provide EXPLICIT citations using numbered references [1], [2], etc.
4. EXTRACT EVERY RELEVANT detail, statistic, figure, date, name, and quote from the sources
5. SYNTHESIZE information across sources to form a complete picture
6. ANALYZE implications, significance, and context for each major point
7. EXPLAIN complex concepts with clear, detailed explanations
8. Include EXTENSIVE use of sub-sections, bullet points, and structured formatting
9. End with a NATURAL, HUMAN-LIKE conclusion with actionable takeaways and personal perspective
10. NEVER invent facts or data not present in the sources - rely EXCLUSIVELY on provided materials

YOUR RESPONSE MUST FOLLOW THIS STRUCTURE:

## Here's What You Need to Know
[CONVERSATIONAL, HUMAN-LIKE summary written in a friendly, helpful tone. Include 2-3 key insights with citations, written as if you're explaining to a friend. Use personal pronouns and natural language. Avoid formal academic tone here.]

## Detailed Report

### Background and Context
[Thorough background information with citations]

### Key Developments and Insights
[Detailed analysis of main points with citations]

### Important Considerations
[Analysis of nuances, debates, or technical aspects with citations]

### Expert Analysis
[Synthesis of information with deeper insights and citations]

## Key Takeaways
- [Clearly explained finding 1 with citations]
- [Clearly explained finding 2 with citations]
- [Clearly explained finding 3 with citations]
- [Clearly explained finding 4 with citations]
- [Clearly explained finding 5 with citations]

## In Conclusion
[A NATURAL, CONVERSATIONAL conclusion that summarizes the main points and provides actionable insights or personal perspective. Write like a helpful human expert would, using warm, approachable language while maintaining authority. 1-2 paragraphs.]

## Sources Referenced
- [1] Source name and details
- [2] Source name and details
...

REMEMBER: Your response must begin and end in a FRIENDLY, CONVERSATIONAL tone like a helpful human expert would use, while the middle detailed report section should be COMPREHENSIVE, extensively cited, and analyze the topic from multiple angles.`;
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
          const simplifiedPrompt = `Answer this question in a friendly, conversational way while providing comprehensive information: "${query}". 
          
Use these search snippets as your ONLY sources of information:
${limitedResults.slice(0, 3).map((r, i) => `Source [${i+1}] - ${r.title}:\n${r.url}\n${r.snippet}`).join('\n\n')}

CRITICAL REQUIREMENTS:
- Start with a FRIENDLY, CONVERSATIONAL summary (about 150 words)
- Then provide a THOROUGH analysis (minimum 500 words total)
- Extract all relevant facts, figures, dates, and quotes from the sources
- Cite sources using [1], [2], etc. after EACH statement or claim
- Use formatting with sections and subsections
- Provide detailed analysis and context for major points
- End with a natural, conversational conclusion
- Never invent facts not present in the sources

YOUR RESPONSE MUST INCLUDE:
1. "Here's What You Need to Know" - a friendly, conversational summary
2. Detailed Report (with multiple subsections)
3. Key Takeaways with citations
4. A conversational conclusion with personal perspective
5. Complete Sources section

Write like a helpful human expert would, using warm, approachable language while still providing thorough information.`;
          
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
      aiResponse = `# ${query}: What You Need to Know

## Here's What You Need to Know
I've looked into "${query}" for you and found some helpful information! Based on the sources I've found, this is a topic with several important aspects worth understanding. While I couldn't generate a complete AI analysis, I've gathered the key information from reliable sources to help you get a good understanding of the topic.

## Detailed Information from Sources

${mergedResults.slice(0, 5).map((result, i) => (
  `### Source ${i+1}: ${result.title}\n\n**URL**: ${result.url}\n\n**Key Information**:\n${result.snippet || 'No description available.'}\n\n**Why This Matters**: This source helps us understand ${query} by providing context about ${result.snippet?.substring(0, 80) || 'relevant aspects of the topic'}.\n`
)).join('\n\n')}

## Main Insights
From what I've found, here are the key points about "${query}":

1. ${mergedResults[0]?.title || 'The first source'} shows that ${mergedResults[0]?.snippet?.substring(0, 100) || 'there is relevant information available'}.
2. ${mergedResults[1]?.title || 'Additional sources'} suggest that ${mergedResults[1]?.snippet?.substring(0, 100) || 'there are multiple aspects to consider'}.
3. Looking at all the sources together, it seems this topic has practical implications that could be valuable for you to explore further.

## What This Means For You
Based on what I've found, you might want to explore:
- More about ${query.split(' ').slice(-2).join(' ')}
- Related topics mentioned in the sources
- Practical applications in your specific context

I hope this helps with your question! Feel free to ask me to explore any specific aspect in more detail.

## Sources
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
        
        // Add missing citations with a conversational note
        aiResponse += `\n\n## Additional Sources I Found Helpful\n\nI also referenced these additional sources that provided valuable context on "${query}":\n\n${limitedResults.slice(0, 5).map((r, i) => 
          `- [${i+1}] ${r.title} (${r.url}) - This helped me understand ${query.split(' ').slice(0, 3).join(' ')} from ${r.source || 'a reliable source'}`
        ).join('\n')}`;
      }
      
      // Check for proper section structure
      if (!hasProperSections && aiResponse.length > 200) {
        console.log("Response lacks proper section structure. Restructuring...");
        
        // Restructure response with proper sections and conversational tone
        const originalContent = aiResponse;
        aiResponse = `# ${query}: What You Need to Know\n\n`;
        
        if (!hasExecutiveSummary) {
          aiResponse += `## Here's What You Need to Know\nI've researched "${query}" for you and found some interesting insights! Based on multiple reliable sources, I can help you understand the key points about this topic. Here's a friendly overview of what I've found, with all the important details you might want.\n\n`;
        }
        
        aiResponse += `## Detailed Report\n\n${originalContent}\n\n`;
        
        // Add missing sections if needed
        if (!aiResponse.toLowerCase().includes('findings') && !aiResponse.toLowerCase().includes('conclusion') && !aiResponse.toLowerCase().includes('takeaway')) {
          aiResponse += `\n\n## Key Takeaways\n`;
          limitedResults.slice(0, 3).forEach((r, i) => {
            aiResponse += `- Based on source [${i+1}], ${r.title.toLowerCase().includes(query.toLowerCase()) ? r.snippet.substring(0, 100) + '...' : 'we learn that ' + r.title + ' provides valuable insights into this topic.'}\n`;
          });
          
          // Add a conversational conclusion
          aiResponse += `\n\n## In Conclusion\nAs we've seen from these sources, ${query} is a topic with several interesting dimensions. I hope this information helps you understand it better! If you have any specific aspects you'd like to explore further, feel free to ask more questions about particular details or related topics.`;
        }
      }
      
      // Add sources section if not present
      if (!aiResponse.toLowerCase().includes('source') && limitedResults.length > 0) {
        aiResponse += `\n\n## Sources I Referenced\n\nHere are the sources I used to answer your question:\n\n${limitedResults.map((r, i) => 
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
