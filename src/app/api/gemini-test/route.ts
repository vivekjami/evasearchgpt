import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Check if Gemini API key is configured
    if (!config.geminiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API key is not configured',
        suggestions: [
          'Add GEMINI_API_KEY to your .env.local file',
          'Add GEMINI_API_KEY to your Vercel environment variables',
          'Make sure the API key is valid and has not expired'
        ]
      }, { status: 500 });
    }
    
    // Initialize Google AI client
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const geminiModelName = 'gemini-2.5-pro';
    
    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: geminiModelName,
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.2,
      }
    });
    
    // Create a simple test prompt
    const testPrompt = 'Respond with a short message saying "Hello from Gemini API!"';
    
    // Set timeout for the API call
    const geminiPromise = model.generateContent(testPrompt);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API test timed out after 10 seconds')), 10000);
    });
    
    // Race between the API call and the timeout
    const result = await Promise.race([geminiPromise, timeoutPromise]) as any;
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({
      success: true,
      message: 'Gemini API connection successful',
      response: text,
      apiInfo: {
        model: geminiModelName,
        keyConfigured: Boolean(config.geminiApiKey),
        keyLength: config.geminiApiKey.length,
        keyPrefix: config.geminiApiKey.substring(0, 4)
      }
    });
    
  } catch (error) {
    console.error('Gemini API test failed:', error);
    
    // Get detailed error info
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    const errorStack = error instanceof Error && error.stack 
      ? error.stack.split('\\n').slice(0, 3).join('\\n')
      : 'No stack trace';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: {
        name: errorName,
        stack: errorStack,
        keyConfigured: Boolean(config.geminiApiKey),
        keyLength: config.geminiApiKey ? config.geminiApiKey.length : 0,
      },
      suggestions: [
        'Check if your Gemini API key is valid',
        'Verify network connectivity from Vercel to Google AI services',
        'Check if you have exceeded your API quota or rate limits',
        'Try regenerating your API key in the Google AI Studio'
      ]
    }, { status: 500 });
  }
}
