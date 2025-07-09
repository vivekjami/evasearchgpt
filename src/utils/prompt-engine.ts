import { SearchResult } from '@/types/search';

export type QueryIntent = 'research' | 'shopping' | 'news' | 'technical' | 'general';

export interface PromptContext {
  query: string;
  results: SearchResult[];
  intent: QueryIntent;
  previousQueries?: string[];
  userContext?: string;
  complexity?: 'simple' | 'detailed' | 'expert';
}

export class PromptEngine {
  // Analyze query to determine intent
  static detectQueryIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();
    
    // Technical/Programming patterns
    const technicalPatterns = [
      'how to', 'tutorial', 'guide', 'install', 'configure', 'setup',
      'code', 'programming', 'api', 'javascript', 'python', 'react',
      'error', 'debug', 'fix', 'troubleshoot', 'implement'
    ];
    
    // Shopping patterns
    const shoppingPatterns = [
      'buy', 'purchase', 'price', 'cost', 'cheap', 'best', 'review',
      'compare', 'vs', 'versus', 'amazon', 'store', 'sale', 'deal'
    ];
    
    // News patterns
    const newsPatterns = [
      'news', 'latest', 'recent', 'update', 'today', 'yesterday',
      'breaking', 'announcement', 'released', 'happened'
    ];
    
    // Research patterns
    const researchPatterns = [
      'what is', 'definition', 'explain', 'analysis', 'study',
      'research', 'statistics', 'data', 'report', 'academic'
    ];
    
    if (technicalPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return 'technical';
    }
    
    if (shoppingPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return 'shopping';
    }
    
    if (newsPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return 'news';
    }
    
    if (researchPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return 'research';
    }
    
    return 'general';
  }
  
  // Generate contextual prompt based on intent
  static generateSearchPrompt(context: PromptContext): string {
    const { query, results, intent, previousQueries, complexity = 'detailed' } = context;
    
    const basePrompt = this.getBasePrompt(complexity);
    const intentSpecificPrompt = this.getIntentSpecificPrompt(intent, complexity);
    const sourcesContext = this.formatSourcesContext(results);
    const conversationContext = this.formatConversationContext(previousQueries);
    
    return `${basePrompt}
    
${intentSpecificPrompt}

Query: "${query}"

${conversationContext}

${sourcesContext}

Please provide a comprehensive yet conversational response that:
1. Starts with a friendly, human-like summary (150-200 words)
2. Cites relevant sources with [1], [2], etc. throughout
3. Provides detailed information and actionable insights
4. Maintains accuracy while using a warm, approachable tone
5. Ends with a natural conclusion and 2-3 follow-up questions

Response format:
- Begin with "Here's What You Need to Know" - a conversational overview written like you're explaining to a friend
- Include detailed explanations with proper citations in a structured format
- Use personal pronouns and natural language to maintain a human-like tone
- Provide relevant examples, context, or steps when helpful
- End with a conversational conclusion offering personal perspective
- Include follow-up questions that feel natural`;
  }
  
  private static getBasePrompt(complexity: string): string {
    const prompts = {
      simple: `You are a friendly, helpful assistant that provides clear, conversational answers to user questions. Keep your responses simple, personable, and easy to understand.`,
      
      detailed: `You are an expert research assistant with deep knowledge across multiple domains. Provide comprehensive, well-structured answers that synthesize information from multiple sources, while maintaining a conversational, approachable tone.`,
      
      expert: `You are a highly specialized yet approachable expert with deep knowledge. Provide detailed, technical responses with nuanced analysis and professional insights, while using a friendly, conversational tone that makes complex information accessible.`
    };
    
    return prompts[complexity as keyof typeof prompts] || prompts.detailed;
  }
  
  private static getIntentSpecificPrompt(intent: QueryIntent, complexity: string): string {
    const prompts = {
      research: {
        simple: `Focus on providing factual information with clear, friendly explanations, like you're helping a curious friend understand the topic.`,
        detailed: `Provide a conversational yet analytical response with proper citations. Balance accuracy and depth with a friendly, approachable tone, presenting multiple perspectives where relevant.`,
        expert: `Deliver a scholarly yet accessible analysis with critical evaluation of sources and academic rigor, while maintaining a warm, engaging tone that makes complex information approachable.`
      },
      
      technical: {
        simple: `Provide step-by-step guidance with clear, friendly instructions, as if you're helping someone learn a new skill.`,
        detailed: `Provide comprehensive yet approachable technical guidance with step-by-step procedures, code examples, and best practices. Use a conversational tone that makes technical concepts accessible.`,
        expert: `Deliver expert-level technical analysis with advanced concepts and professional recommendations, while using an engaging, personable tone that makes complex technical information understandable.`
      },
      
      shopping: {
        simple: `Help compare options and highlight key features in a friendly, helpful way, like giving advice to a friend who's shopping.`,
        detailed: `Compare options thoroughly with a conversational tone, analyze features, pricing, and provide personalized purchasing recommendations with clear pros/cons.`,
        expert: `Provide detailed yet accessible market analysis, feature comparison, and strategic purchasing advice in a friendly tone that helps the reader feel confident in their decision.`
      },
      
      news: {
        simple: `Summarize the key facts and recent developments in a conversational, engaging way, like you're catching someone up on current events.`,
        detailed: `Summarize recent developments with timeline, key facts, and context about significance, using a warm, informative tone that makes news digestible.`,
        expert: `Provide comprehensive news analysis with background context, implications, and expert commentary, while maintaining an engaging narrative style that keeps complex news accessible.`
      },
      
      general: {
        simple: `Provide a helpful, friendly, and conversational response that feels like advice from a knowledgeable friend.`,
        detailed: `Provide a comprehensive, engaging answer that addresses all aspects of the question with a personable tone that makes information accessible.`,
        expert: `Deliver an expert-level response with deep analysis and professional insights, while using a warm, conversational tone that builds rapport with the reader.`
      }
    };
    
    const intentPrompts = prompts[intent];
    return intentPrompts[complexity as keyof typeof intentPrompts] || prompts.general.detailed;
  }
  
  private static formatSourcesContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No sources available. Please provide the best answer you can based on your knowledge.';
    }
    
    const sourcesText = results.map((result, index) => {
      return `[${index + 1}] ${result.title}
URL: ${result.url}
Source: ${result.source}
Relevance: ${result.relevanceScore}%
Summary: ${result.snippet}
${result.publishedDate ? `Published: ${result.publishedDate}` : ''}
---`;
    }).join('\n');
    
    return `Sources to reference:
${sourcesText}`;
  }
  
  private static formatConversationContext(previousQueries?: string[]): string {
    if (!previousQueries || previousQueries.length === 0) {
      return '';
    }
    
    const recentQueries = previousQueries.slice(-3).join(', ');
    return `Previous conversation context: ${recentQueries}`;
  }
  
  // Generate follow-up questions based on context
  static generateFollowUpQuestions(
    query: string,
    results: SearchResult[],
    intent: QueryIntent
  ): string[] {
    // Extract the key topic once to keep it consistent
    const keyTopic = this.extractKeyTopic(query);
    
    // Don't repeat the original query in follow-up questions
    const isQueryAboutLatestDevelopments = 
      query.toLowerCase().includes('latest') || 
      query.toLowerCase().includes('developments') ||
      query.toLowerCase().includes('recent') ||
      query.toLowerCase().includes('breakthroughs');
    
    const templates = {
      research: [
        isQueryAboutLatestDevelopments 
          ? `What are the major challenges facing ${keyTopic}?` 
          : `What are the latest developments in ${keyTopic}?`,
        `How does ${keyTopic} compare to traditional approaches?`,
        `What are the practical applications of ${keyTopic}?`,
        `What is the future outlook for ${keyTopic}?`
      ],
      
      technical: [
        `What are the best practices for implementing ${keyTopic}?`,
        `How can I optimize ${keyTopic} for better performance?`,
        `What common issues might arise when working with ${keyTopic}?`,
        `Which tools are recommended for working with ${keyTopic}?`
      ],
      
      shopping: [
        `What are the top alternatives to consider for ${keyTopic}?`,
        `How do different brands of ${keyTopic} compare?`,
        `What features should I prioritize when choosing ${keyTopic}?`,
        `What's the price range for high-quality ${keyTopic}?`
      ],
      
      news: [
        `What are the broader implications of ${keyTopic}?`,
        `How has ${keyTopic} evolved over the past year?`,
        `What might be the next developments in ${keyTopic}?`,
        `How are different industries responding to ${keyTopic}?`
      ],
      
      general: [
        `What are the key benefits of ${keyTopic}?`,
        `How is ${keyTopic} typically implemented or used?`,
        `What are common misconceptions about ${keyTopic}?`,
        `How might ${keyTopic} evolve in the future?`
      ]
    };
    
    // Look at search results for additional context
    let additionalQuestions: string[] = [];
    if (results && results.length > 0) {
      // Extract potentially interesting topics from titles
      const titles = results.map(r => r.title || '');
      
      // Look for years/dates to ask about timeline
      const hasYearMentions = titles.some(t => /\b20\d\d\b/.test(t));
      if (hasYearMentions && !query.toLowerCase().includes('history')) {
        additionalQuestions.push(`What is the history and evolution of ${keyTopic}?`);
      }
      
      // Look for comparisons
      const hasComparisons = titles.some(t => /\b(vs|versus|compared|against)\b/i.test(t));
      if (hasComparisons) {
        additionalQuestions.push(`What are the key differences between competing ${keyTopic} approaches?`);
      }
      
      // Look for applications
      const hasApplications = titles.some(t => /\b(use|using|application|applied|implement)\b/i.test(t));
      if (hasApplications) {
        additionalQuestions.push(`What are some real-world examples of ${keyTopic} in action?`);
      }
    }
    
    // Add domain-specific questions based on results
    const domainQuestions = this.generateDomainSpecificQuestions(results);
    
    // Combine all questions, prioritizing additional context-aware ones
    const baseQuestions = templates[intent] || templates.general;
    const allQuestions = [
      ...baseQuestions.slice(0, 2), 
      ...additionalQuestions,
      ...domainQuestions,
      ...baseQuestions.slice(2)
    ];
    
    // Return 3 unique questions
    return [...new Set(allQuestions)].slice(0, 3);
  }
  
  private static extractKeyTopic(query: string): string {
    // Enhanced keyword extraction with phrase preservation
    const stopWords = [
      'what', 'how', 'why', 'when', 'where', 'is', 'are', 'tell', 'me', 'about',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
      'with', 'by', 'latest', 'best', 'top', 'news', 'explain', 'describe', 
      'works', 'does', 'do', 'can', 'could', 'would', 'should'
    ];
    
    // First remove common question patterns
    let cleanedQuery = query
      .replace(/^(what is|what are|how does|how to|tell me about|explain|describe)/gi, '')
      .trim();
    
    // If after removing patterns we have a good phrase, use it
    if (cleanedQuery.split(' ').length >= 2) {
      return cleanedQuery;
    }
    
    // Otherwise, fall back to more aggressive filtering
    const words = query.toLowerCase().split(/\s+/).filter(word => !stopWords.includes(word));
    
    // Try to preserve noun phrases by keeping adjacent words
    const topicPhrase = words.slice(0, 4).join(' ');
    
    return topicPhrase || 'this topic';
  }
  
  private static generateDomainSpecificQuestions(results: SearchResult[]): string[] {
    const domains = results.map(r => r.domain).filter(Boolean);
    const uniqueDomains = [...new Set(domains)];
    
    const domainQuestions: string[] = [];
    
    if (uniqueDomains.includes('github.com')) {
      domainQuestions.push('How can I implement this in my own project?');
    }
    
    if (uniqueDomains.includes('stackoverflow.com')) {
      domainQuestions.push('What are common issues developers face with this?');
    }
    
    if (uniqueDomains.includes('wikipedia.org')) {
      domainQuestions.push('What is the historical context of this topic?');
    }
    
    return domainQuestions;
  }
  
  // A/B testing for prompt optimization
  static generateOptimizedPrompt(context: PromptContext, variant: 'A' | 'B' = 'A'): string {
    if (variant === 'B') {
      // Alternative prompt structure for testing
      return this.generateAlternativePrompt(context);
    }
    
    return this.generateSearchPrompt(context);
  }
  
  private static generateAlternativePrompt(context: PromptContext): string {
    const { query, results, intent } = context;
    
    return `Task: Answer the user's question in a friendly, conversational way using the provided sources.

User Question: "${query}"
Query Type: ${intent}

Available Sources:
${this.formatSourcesContext(results)}

Instructions:
- Begin with a friendly, conversational summary (150-200 words)
- Use numbered citations [1], [2], etc. throughout
- Be thorough but approachable in your explanations
- Include actionable insights and personal perspective
- End with a natural conclusion and related questions
- Use a warm, helpful tone throughout

Please respond now with a human-like, informative answer:`;
  }
}

// Performance tracking for prompt optimization
export class PromptOptimizer {
  private static metrics = new Map<string, {
    variant: 'A' | 'B';
    responseTime: number;
    userSatisfaction: number;
    followUpClicks: number;
    count: number;
  }>();
  
  static trackPromptPerformance(
    promptId: string,
    variant: 'A' | 'B',
    responseTime: number,
    userSatisfaction: number,
    followUpClicks: number
  ) {
    const existing = this.metrics.get(promptId);
    
    if (existing) {
      existing.responseTime = (existing.responseTime * existing.count + responseTime) / (existing.count + 1);
      existing.userSatisfaction = (existing.userSatisfaction * existing.count + userSatisfaction) / (existing.count + 1);
      existing.followUpClicks = (existing.followUpClicks * existing.count + followUpClicks) / (existing.count + 1);
      existing.count++;
    } else {
      this.metrics.set(promptId, {
        variant,
        responseTime,
        userSatisfaction,
        followUpClicks,
        count: 1,
      });
    }
  }
  
  static getOptimalVariant(promptId: string): 'A' | 'B' {
    const metric = this.metrics.get(promptId);
    if (!metric || metric.count < 10) {
      return Math.random() < 0.5 ? 'A' : 'B'; // Random until we have enough data
    }
    
    // Use composite score for optimization
    const score = (metric.userSatisfaction * 0.5) + (metric.followUpClicks * 0.3) + ((1 / metric.responseTime) * 1000 * 0.2);
    
    return score > 0.7 ? metric.variant : (metric.variant === 'A' ? 'B' : 'A');
  }
}
