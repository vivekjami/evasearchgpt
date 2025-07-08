import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchBrave, searchSerpAPI } from '@/utils/search-apis';
import { mergeSearchResults } from '@/utils/result-merger';
import { PromptEngine } from '@/utils/prompt-engine';
import config from '@/lib/config';
import { PerformanceMonitor } from '@/utils/performance-monitor';
import { SearchResult } from '@/types/search';
import { z } from 'zod';

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const geminiModelName = 'gemini-2.5-pro'; // Updated model name

// Validate chat request
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.string().optional()
    })
  ).optional(),
});

export async function POST(request: NextRequest) {
  const perfTimer = PerformanceMonitor.startTimer('chat_api_total');
  
  try {
    // Parse and validate request
    const body = await request.json();
    
    // Check for missing message before validation
    if (!body.message || body.message.trim() === '') {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }
    
    const { message, history = [] } = chatRequestSchema.parse(body);
    
    // Extract previous queries for context
    const previousQueries = history
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content);
    
    // Detect intent
    const detectedIntent = PromptEngine.detectQueryIntent(message);
    
    // For certain intents, we might want to search for additional context
    let searchResults: SearchResult[] = [];
    
    if (detectedIntent !== 'general') {
      // Execute searches in parallel
      const searchPromises = [
        searchBrave(message),
        searchSerpAPI(message),
      ];
      
      const responses = await Promise.allSettled(searchPromises);
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
      searchResults = mergeSearchResults(apiResponses);
    }
    
    // Generate prompt based on the conversation context
    const prompt = PromptEngine.generateSearchPrompt({
      query: message,
      results: searchResults,
      intent: detectedIntent,
      previousQueries,
    });
    
    // Generate response from AI
    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Generate follow-up questions
    const followUpQuestions = [
      `Can you explain more about this topic?`,
      `What are some practical applications?`,
      `Are there any alternatives to consider?`
    ];
    
    // Calculate confidence score
    const confidence = searchResults.length > 0
      ? searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length
      : 70; // Default confidence for general queries
    
    const totalTime = perfTimer(true, {
      intent: detectedIntent,
      searchResultsCount: searchResults.length
    });
    
    return NextResponse.json({
      answer: response.text(),
      sources: searchResults.slice(0, 3),
      followUpQuestions,
      confidence: Math.min(100, Math.max(0, confidence)),
      processingTime: totalTime,
      queryIntent: detectedIntent,
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    perfTimer(false, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return NextResponse.json(
      { error: 'Chat processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
