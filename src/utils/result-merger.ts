import { SearchResult, SearchApiResponse } from '@/types/search';

// URL similarity calculation
function calculateUrlSimilarity(url1: string, url2: string): number {
  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);
    
    // Same domain and similar paths
    if (u1.hostname === u2.hostname) {
      const path1 = u1.pathname.toLowerCase();
      const path2 = u2.pathname.toLowerCase();
      
      if (path1 === path2) return 1.0;
      
      // Calculate path similarity
      const pathSimilarity = calculateStringSimilarity(path1, path2);
      return pathSimilarity > 0.8 ? pathSimilarity : 0;
    }
    
    return 0;
  } catch {
    return 0;
  }
}

// String similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

// Title similarity check
function calculateTitleSimilarity(title1: string, title2: string): number {
  const t1 = title1.toLowerCase().trim();
  const t2 = title2.toLowerCase().trim();
  
  if (t1 === t2) return 1.0;
  
  return calculateStringSimilarity(t1, t2);
}

// Remove duplicate results
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const uniqueResults: SearchResult[] = [];
  const seenUrls = new Set<string>();
  
  for (const result of results) {
    let isDuplicate = false;
    
    // Check for exact URL match
    if (seenUrls.has(result.url)) {
      isDuplicate = true;
    } else {
      // Check for similar URLs and titles
      for (const existing of uniqueResults) {
        const urlSimilarity = calculateUrlSimilarity(result.url, existing.url);
        const titleSimilarity = calculateTitleSimilarity(result.title, existing.title);
        
        if (urlSimilarity > 0.8 || titleSimilarity > 0.9) {
          isDuplicate = true;
          
          // Keep the result with higher relevance score
          if (result.relevanceScore > existing.relevanceScore) {
            const index = uniqueResults.indexOf(existing);
            uniqueResults[index] = result;
            seenUrls.delete(existing.url);
            seenUrls.add(result.url);
          }
          break;
        }
      }
    }
    
    if (!isDuplicate) {
      uniqueResults.push(result);
      seenUrls.add(result.url);
    }
  }
  
  return uniqueResults;
}

// Calculate domain authority score
function calculateDomainAuthority(domain: string): number {
  const authorityDomains: Record<string, number> = {
    'wikipedia.org': 95,
    'github.com': 90,
    'stackoverflow.com': 85,
    'medium.com': 80,
    'reddit.com': 75,
    'quora.com': 70,
    'youtube.com': 85,
    'docs.google.com': 80,
    'microsoft.com': 90,
    'apple.com': 90,
    'mozilla.org': 85,
    'w3.org': 90,
    'ieee.org': 95,
    'acm.org': 95,
    'arxiv.org': 90,
    'nature.com': 95,
    'science.org': 95,
    'pubmed.ncbi.nlm.nih.gov': 95,
  };
  
  return authorityDomains[domain] || 50;
}

// Calculate freshness score
function calculateFreshnessScore(publishedDate?: string): number {
  if (!publishedDate) return 50;
  
  try {
    const date = new Date(publishedDate);
    const now = new Date();
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) return 100;
    if (daysDiff <= 7) return 90;
    if (daysDiff <= 30) return 80;
    if (daysDiff <= 90) return 70;
    if (daysDiff <= 365) return 60;
    
    return 40;
  } catch {
    return 50;
  }
}

// Enhanced scoring algorithm
export function scoreResults(results: SearchResult[]): SearchResult[] {
  return results.map(result => {
    const domainAuthority = calculateDomainAuthority(result.domain || '');
    const freshnessScore = calculateFreshnessScore(result.publishedDate);
    const sourceWeight = getSourceWeight(result.source);
    
    // Combine multiple factors
    const enhancedScore = (
      result.relevanceScore * 0.4 +
      domainAuthority * 0.3 +
      freshnessScore * 0.2 +
      sourceWeight * 0.1
    );
    
    return {
      ...result,
      relevanceScore: Math.min(100, Math.max(0, enhancedScore)),
    };
  });
}

function getSourceWeight(source: string): number {
  const weights: Record<string, number> = {
    'brave': 85,
    'serpapi': 90,
  };
  
  return weights[source] || 50;
}

// Main result merging function
export function mergeSearchResults(apiResponses: SearchApiResponse[]): SearchResult[] {
  const startTime = Date.now();
  
  // Combine all results
  const allResults: SearchResult[] = [];
  let totalSuccessfulSources = 0;
  
  for (const response of apiResponses) {
    if (response.success && response.results.length > 0) {
      allResults.push(...response.results);
      totalSuccessfulSources++;
    }
  }
  
  if (allResults.length === 0) {
    return [];
  }
  
  // Remove duplicates
  const uniqueResults = deduplicateResults(allResults);
  
  // Apply enhanced scoring
  const scoredResults = scoreResults(uniqueResults);
  
  // Sort by relevance score and return top 15
  const finalResults = scoredResults
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 15);
  
  console.log(`Result merging completed in ${Date.now() - startTime}ms`);
  console.log(`Merged ${allResults.length} results into ${finalResults.length} unique results`);
  console.log(`Sources used: ${totalSuccessfulSources}/${apiResponses.length}`);
  
  return finalResults;
}

// Quality assessment
export function assessResultQuality(results: SearchResult[]): {
  quality: 'high' | 'medium' | 'low';
  confidence: number;
  issues: string[];
} {
  const issues: string[] = [];
  let qualityScore = 100;
  
  if (results.length === 0) {
    return {
      quality: 'low',
      confidence: 0,
      issues: ['No results found'],
    };
  }
  
  if (results.length < 5) {
    qualityScore -= 20;
    issues.push('Limited number of results');
  }
  
  const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
  if (avgRelevance < 60) {
    qualityScore -= 25;
    issues.push('Low average relevance score');
  }
  
  const uniqueDomains = new Set(results.map(r => r.domain)).size;
  if (uniqueDomains < 3) {
    qualityScore -= 15;
    issues.push('Limited source diversity');
  }
  
  const withDates = results.filter(r => r.publishedDate).length;
  if (withDates < results.length * 0.5) {
    qualityScore -= 10;
    issues.push('Many results lack publication dates');
  }
  
  let quality: 'high' | 'medium' | 'low' = 'high';
  if (qualityScore < 50) quality = 'low';
  else if (qualityScore < 75) quality = 'medium';
  
  return {
    quality,
    confidence: Math.max(0, Math.min(100, qualityScore)),
    issues,
  };
}
