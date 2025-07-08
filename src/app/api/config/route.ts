import { NextRequest, NextResponse } from 'next/server';
import config from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Check if API keys are loaded
    const apiStatus = {
      gemini: config.geminiApiKey ? 'Configured' : 'Missing',
      brave: config.braveRapidApiKey && config.braveRapidApiHost ? 'Configured' : 'Missing',
      serpapi: config.serpApiKey ? 'Configured' : 'Missing',
      appUrl: config.appUrl
    };
    
    return NextResponse.json({
      status: 'ok',
      env: process.env.NODE_ENV,
      apiStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
