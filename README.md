# EvaSearchGPT

*Next-generation search interface that combines multiple search sources with AI reasoning to deliver intelligent, contextual answers instead of just links.*

## Vision

Traditional search gives you links. EvaSearchGPT gives you **answers**. By fusing multiple search sources with advanced prompt engineering, we create a search experience that understands context, maintains conversation flow, and delivers actionable insights.

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │    │  Next.js API    │    │  External APIs  │
│                 │    │                 │    │                 │
│ • Chat Interface│────│ • Query Router  │────│ • Brave Search  │
│ • Result Display│    │ • LLM Processor │    │ • SerpAPI       │
│ • Analytics UI  │    │ • Result Merger │    │ • Gemini API    │
│ • Follow-ups    │    │ • Prompt Engine │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│   TypeScript    │──────────────┘
                        │   Data Layer    │
                        │                 │
                        │ • Query Models  │
                        │ • Result Types  │
                        │ • Analytics     │
                        └─────────────────┘
```

## Core Features

### 1. Multi-Source Search Fusion
- **Simultaneous API Queries**: Query Brave, SerpAPI, and Bing simultaneously
- **Intelligent Deduplication**: Remove duplicate results across sources
- **Source Reliability Scoring**: Rank sources based on authority and relevance
- **Real-time Performance Tracking**: Monitor API response times and success rates

### 2. LLM-Powered Answer Synthesis
- **Context-Aware Responses**: Generate coherent answers from multiple sources
- **Proper Citation**: Include clickable source links with relevance scores
- **Follow-up Generation**: AI suggests related questions automatically
- **Query Intent Detection**: Classify queries (research, shopping, news, technical)

### 3. Interactive Search Chat
- **Conversation Memory**: Maintain context across multiple queries
- **Clarification Requests**: Ask users for more specific information when needed
- **Progressive Disclosure**: Start with summaries, allow drilling into details
- **Smart Suggestions**: Recommend related searches based on current context

### 4. Advanced Prompt Engineering
- **Dynamic Templates**: Different prompt strategies for different query types
- **A/B Testing Framework**: Compare prompt effectiveness with metrics
- **Optimization Dashboard**: Track prompt performance and user satisfaction
- **Fallback Strategies**: Handle API failures gracefully

## Performance Metrics

### Speed Benchmarks
- **Average Response Time**: < 3 seconds for complete answer
- **Search API Latency**: < 1 second for all sources combined
- **LLM Processing**: < 2 seconds for answer synthesis
- **Frontend Rendering**: < 500ms for result display

### Quality Metrics
- **Source Diversity**: Average 3+ unique sources per answer
- **Citation Accuracy**: 95%+ correct source attribution
- **User Satisfaction**: Measured through follow-up engagement
- **Query Success Rate**: 90%+ queries receive actionable answers

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Next.js 14** (App Router)
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for analytics visualization

### Backend
- **Next.js API Routes** (TypeScript)
- **Node.js** runtime
- **Zod** for type validation
- **Rate limiting** with upstash-redis

### AI & Search
- **Google Gemini** (Free tier)
- **Brave Search API** (Free tier)
- **SerpAPI** (Free tier)
- **Bing Search API** (Free tier)

### Deployment
- **Vercel** (Frontend + API)
- **Upstash Redis** (Rate limiting)
- **Vercel Analytics** (Performance monitoring)

##  User Stories

### Primary User Flow
```
As a researcher, I want to ask complex questions and receive 
comprehensive answers with proper citations, so I can quickly 
understand topics without clicking through multiple links.
```

### Secondary User Flows
```
As a professional, I want to ask follow-up questions in a 
conversation format, so I can dive deeper into specific aspects 
of my research.

As a student, I want to see source reliability scores, so I can 
trust the information I'm receiving for academic work.

As a developer, I want to see the prompt engineering strategies 
used, so I can understand how the AI generates its responses.
```

## 🔄 User Journey

1. **Initial Query**: User types a question or search term
2. **Processing Indicator**: Real-time status showing API calls in progress
3. **Source Collection**: Display found sources with relevance scores
4. **Answer Generation**: Stream AI-generated response with citations
5. **Follow-up Suggestions**: Present related questions for deeper exploration
6. **Conversation Continuation**: Maintain context for additional queries

## 🚦 API Rate Limits & Costs

### Free Tier Limits
- **Brave Search**: 2,000 queries/month
- **SerpAPI**: 100 queries/month
- **Bing Search**: 1,000 queries/month
- **Google Gemini**: 15 requests/minute, 1,500 requests/day

### Cost Optimization
- **Intelligent Caching**: Cache results for 1 hour to reduce API calls
- **Query Optimization**: Combine similar queries to maximize API efficiency
- **Fallback Strategies**: Use different APIs when rate limits are hit
- **User Rate Limiting**: Prevent abuse while maintaining good UX

##  Future Enhancements

### Phase 2 Features
- **Multi-modal Search**: Image and video search integration
- **Collaborative Search**: Share search sessions with team members
- **Custom Source Preferences**: Allow users to prioritize certain sources
- **Advanced Analytics**: Detailed usage patterns and optimization insights

### Phase 3 Features
- **API Marketplace**: Allow users to connect their own search APIs
- **Plugin System**: Extensible architecture for custom search sources
- **Enterprise Features**: Team management and usage analytics
- **Mobile App**: Native iOS/Android applications

##  Success Metrics

### User Engagement
- **Session Duration**: Average time spent in search conversations
- **Query Depth**: Number of follow-up questions per session
- **Return Rate**: Percentage of users who return within 7 days
- **Share Rate**: How often users share results with others

### Technical Performance
- **Uptime**: 99.9% availability target
- **Error Rate**: < 1% of queries result in errors
- **API Success Rate**: 95%+ successful responses from external APIs
- **Response Quality**: User satisfaction scores on generated answers

## 🤝 Contributing

This project demonstrates advanced search technology integration and would be perfect for:
- **Frontend Engineers**: React/TypeScript component architecture
- **Backend Engineers**: API integration and prompt engineering
- **AI Engineers**: LLM optimization and evaluation
- **Product Managers**: Feature prioritization and user experience design

---

*Built with ❤️ to demonstrate the future of search technology*
