# Troubleshooting Gemini API Issues in Vercel Deployment

If you're experiencing issues with the Google Gemini API responses not showing up in your Vercel deployment, here's a comprehensive troubleshooting guide.

## Common Issues & Solutions

### 1. Gemini API Key Issues

**Problem**: Missing or invalid API key
- **Check 1**: Verify your Gemini API key is correctly set in Vercel environment variables
- **Check 2**: Verify the API key is valid and not expired
- **Check 3**: Make sure the API key has permissions for the model you're using

**Solution**:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to Vercel environment variables as `GEMINI_API_KEY`
4. Redeploy your application

### 2. Request Timeouts

**Problem**: Gemini API requests time out on Vercel
- **Check 1**: Look for 504 Gateway Timeout errors in Vercel logs
- **Check 2**: Check if the response time exceeds Vercel's serverless function timeout

**Solution**:
1. Set `USE_SIMPLIFIED_PROMPT=true` in Vercel environment variables
2. Verify `maxDuration: 120` is set in `vercel.json`
3. Consider reducing the amount of content sent to Gemini API

### 3. Model Usage Limitations

**Problem**: Exceeding API quotas or rate limits
- **Check 1**: Check your Gemini API usage in Google Cloud Console
- **Check 2**: Verify if there are any rate limit errors in the logs

**Solution**:
1. Increase your API quota if needed
2. Implement rate limiting on your end
3. Use the `/api/gemini-test` endpoint to test API connection

### 4. Content Safety Filters

**Problem**: Content is being blocked by Gemini's safety filters
- **Check 1**: Look for specific error messages related to content filtering
- **Check 2**: Check if certain queries consistently fail

**Solution**:
1. Adjust your prompts to avoid potentially sensitive topics
2. Check Google's content policy for Gemini API

### 5. Network & Proxy Issues

**Problem**: Network connectivity from Vercel to Google API services
- **Check 1**: Verify that outbound connections are allowed in your Vercel configuration

**Solution**:
1. Test connectivity using the `/api/gemini-test` endpoint
2. Contact Vercel support if persistent network issues occur

## Debugging Steps

1. Use the new `/api/gemini-test` endpoint to test direct Gemini API connectivity
2. Check Vercel function logs for detailed error messages
3. Try setting `USE_SIMPLIFIED_PROMPT=true` to use a simpler prompt format
4. Adjust `GEMINI_MAX_TOKENS` to a lower value (e.g., 500) to reduce response size
5. Verify all environment variables are correctly set in Vercel

## Vercel Environment Configuration

Make sure these environment variables are set in your Vercel project:

```
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-pro
GEMINI_MAX_TOKENS=1000
USE_SIMPLIFIED_PROMPT=false
BRAVE_RAPIDAPI_KEY=your_brave_api_key
BRAVE_RAPIDAPI_HOST=brave-web-search.p.rapidapi.com
SERPAPI_KEY=your_serpapi_key
```

## Testing Endpoint

The application now includes a dedicated test endpoint:

```
GET /api/gemini-test
```

This endpoint will attempt to make a simple call to the Gemini API and return:
- Success status
- Sample response
- API configuration details
- Detailed error information if it fails

Use this to verify your Gemini API setup is working correctly.
