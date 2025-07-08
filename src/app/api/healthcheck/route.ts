import { NextRequest, NextResponse } from 'next/server';
import config from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Deep check for API keys
    const apiStatus = {
      gemini: {
        configured: Boolean(config.geminiApiKey),
        status: config.geminiApiKey ? 'Available' : 'Missing',
        length: config.geminiApiKey?.length || 0,
        preview: config.geminiApiKey ? `${config.geminiApiKey.substring(0, 3)}...${config.geminiApiKey.substring(config.geminiApiKey.length - 3)}` : null,
      },
      brave: {
        rapidApiKey: {
          configured: Boolean(config.braveRapidApiKey),
          status: config.braveRapidApiKey ? 'Available' : 'Missing',
          length: config.braveRapidApiKey?.length || 0,
          preview: config.braveRapidApiKey ? `${config.braveRapidApiKey.substring(0, 3)}...${config.braveRapidApiKey.substring(config.braveRapidApiKey.length - 3)}` : null,
        },
        rapidApiHost: {
          configured: Boolean(config.braveRapidApiHost),
          status: config.braveRapidApiHost ? 'Available' : 'Missing',
          value: config.braveRapidApiHost,
        }
      },
      serpapi: {
        configured: Boolean(config.serpApiKey),
        status: config.serpApiKey ? 'Available' : 'Missing',
        length: config.serpApiKey?.length || 0,
        preview: config.serpApiKey ? `${config.serpApiKey.substring(0, 3)}...${config.serpApiKey.substring(config.serpApiKey.length - 3)}` : null,
      },
      appUrl: config.appUrl,
      environment: process.env.NODE_ENV,
    };

    // Also check for raw environment variables
    const envCheck = {
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
      BRAVE_RAPIDAPI_KEY: Boolean(process.env.BRAVE_RAPIDAPI_KEY),
      BRAVE_RAPIDAPI_HOST: Boolean(process.env.BRAVE_RAPIDAPI_HOST),
      SERPAPI_KEY: Boolean(process.env.SERPAPI_KEY),
      NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    };

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      apiStatus,
      environmentVariables: envCheck
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
