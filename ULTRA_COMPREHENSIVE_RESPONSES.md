# Ultra-Comprehensive Gemini Response Configuration

This guide explains how to configure EvaSearchGPT for maximum detail and depth in AI-generated responses.

## New Configuration Parameters

The application now supports these additional parameters for ultra-detailed responses:

| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `FORCE_COMPREHENSIVE_RESPONSES` | Forces extensive, detailed responses with multiple sections | `true` |
| `MIN_RESPONSE_LENGTH` | Minimum word count expected in responses | `800` |
| `GEMINI_MAX_TOKENS` | Maximum output tokens for Gemini responses | `4000` |
| `MAX_RESULTS_TO_PROCESS` | Number of search results to include in Gemini prompt | `8` |

## Response Structure

With these settings enabled, Gemini responses will follow this comprehensive structure:

### 1. Executive Summary
A concise overview (2-3 paragraphs) that summarizes the key findings.

### 2. Comprehensive Analysis
The main body of the response (600+ words) containing:
- Historical context and background
- Current developments and breakthroughs
- Technical aspects and methodologies
- Implications and future directions

### 3. Key Findings
A structured list of at least 5 detailed findings with multiple citations.

### 4. Comprehensive Source Analysis
Detailed explanation of each source, including what specific information was extracted.

## Post-Processing Enhancements

If Gemini fails to provide a sufficiently detailed response, the system automatically:

1. Checks the word count against the minimum requirement
2. Verifies sufficient citation density throughout
3. Validates proper section structure
4. Ensures an executive summary is present
5. Adds missing sections as needed
6. Expands underdeveloped sections with source content
7. Creates a complete source references section

## Sample Query Parameters

For maximum detail in responses, include these parameters:

```
{
  "query": "your question here",
  "options": {
    "detailLevel": "maximum",
    "minWords": 800,
    "forceSectionStructure": true
  }
}
```

## Examples of Ultra-Comprehensive Responses

A complete response will typically:
- Be 800-1000+ words in length
- Include 15+ source citations
- Contain 4+ major sections with subsections
- Provide extensive detail on each important point
- Compare information across multiple sources
- Include specific facts, figures, dates, and quotes
- Analyze implications and future directions

## Advanced Configuration

For specialized use cases, additional settings can be adjusted:
- `temperature`: Lower for more factual responses (default: 0.2)
- `topP`: Controls diversity of token selection (default: 0.9)
- Citation style and frequency
- Section structure and requirements

## Optimizing for Vercel Deployment

When running in Vercel production:
1. Ensure serverless function timeout is set to at least 120 seconds
2. Monitor memory usage as these comprehensive responses require more resources
3. Consider caching frequent queries to reduce API load

These settings produce truly in-depth, research-quality responses that synthesize information from multiple sources into a definitive resource.
