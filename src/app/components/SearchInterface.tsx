'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIResponse } from '@/types/search';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import ChatMessage from '@/app/components/ChatMessage';
import SearchHints from '@/app/components/SearchHints';
import LoadingIndicator from '@/app/components/LoadingIndicator';

export default function SearchInterface() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    
    // Add to search history
    setSearchHistory(prev => {
      const newHistory = [...prev];
      if (!newHistory.includes(searchQuery)) {
        newHistory.unshift(searchQuery);
        // Keep only last 5 searches
        return newHistory.slice(0, 5);
      }
      return newHistory;
    });
    
    // Get previous queries as context for the API
    const previousQueries = messages
      .filter(msg => msg.type === 'user')
      .slice(-3)
      .map(msg => msg.content);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery,
          context: previousQueries.length > 0 ? previousQueries : undefined
        })
      });
      
      if (!response.ok) {
        // Try to get more detailed error information from the response
        let errorDetail = '';
        try {
          const errorResponse = await response.json();
          errorDetail = errorResponse.details || errorResponse.error || '';
        } catch (e) {
          // Ignore JSON parse errors
        }
        
        throw new Error(
          `Search failed with status: ${response.status}${errorDetail ? ` - ${errorDetail}` : ''}`
        );
      }
      
      const data: AIResponse = await response.json();
      
      setMessages(prev => [...prev, 
        {
          type: 'user',
          content: searchQuery,
          timestamp: new Date().toISOString()
        }, 
        {
          type: 'assistant',
          content: data.answer,
          sources: data.sources,
          followUpQuestions: data.followUpQuestions,
          processingTime: data.processingTime,
          queryIntent: data.queryIntent,
          confidence: data.confidence,
          timestamp: new Date().toISOString()
        }
      ]);
      
    } catch (error) {
      console.error('Search failed:', error);
      
      // Get more detailed error message
      let errorMessage = 'Sorry, I encountered an error while processing your request. Please try again.';
      let errorTitle = 'Error';
      let errorSuggestion = 'Please try again with a different query or contact support if the issue persists.';
      
      if (error instanceof Error) {
        // Extract the error message
        errorMessage = error.message;
        
        // Add troubleshooting information for different errors
        if (error.message.includes('500')) {
          errorTitle = 'Server Configuration Error';
          errorMessage = 'The search service is missing required configuration.';
          errorSuggestion = 'This is likely due to missing API keys on the server. Please check environment variables or contact support.';
        } else if (error.message.includes('504')) {
          errorTitle = 'Search Timeout';
          errorMessage = 'Your search request took too long to process.';
          errorSuggestion = 'Try again with a more specific query, or break your question into smaller parts. Our search APIs might be experiencing high demand right now.';
        } else if (error.message.includes('429')) {
          errorTitle = 'Rate Limit Exceeded';
          errorMessage = 'You\'ve made too many requests in a short period.';
          errorSuggestion = 'Please wait a moment before trying again. This helps us ensure fair usage for all users.';
        } else if (error.message.includes('400')) {
          errorTitle = 'Invalid Request';
          errorMessage = 'Your search query couldn\'t be processed.';
          errorSuggestion = 'Try reformulating your question or using different keywords.';
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Format the error message nicely
      const formattedErrorMessage = `## ${errorTitle}\n\n${errorMessage}\n\n**Suggestion:** ${errorSuggestion}`;
      
      
      setMessages(prev => [...prev, 
        {
          type: 'user',
          content: searchQuery,
          timestamp: new Date().toISOString()
        }, 
        {
          type: 'assistant',
          content: formattedErrorMessage,
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  }, [messages]);
  
  const handleFollowUpQuestion = useCallback((question: string) => {
    setQuery(question);
    handleSearch(question);
  }, [handleSearch]);
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Search Input */}
      <motion.div 
        className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm pt-2 pb-6 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="Ask me anything..."
            className="w-full px-5 py-4 border rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            disabled={isLoading}
          />
          <motion.button
            onClick={() => handleSearch(query)}
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-2.5 bg-blue-500 text-white px-5 py-2 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </motion.button>
        </div>
        
        {/* Recent Searches */}
        {searchHistory.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-gray-500 pt-1">Recent searches:</span>
            {searchHistory.map((item, i) => (
              <motion.button
                key={i}
                onClick={() => handleSearch(item)}
                className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                {item.length > 25 ? `${item.substring(0, 25)}...` : item}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
      
      {/* Chat Messages */}
      <div className="space-y-8">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ChatMessage
                message={message}
                onFollowUpClick={handleFollowUpQuestion}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      {/* Loading State with enhanced progress indicator */}
      <LoadingIndicator isLoading={isLoading} query={query || ''} />
      
      {/* Empty State */}
      {messages.length === 0 && !isLoading && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center p-8 bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-sm border border-blue-100">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-2xl font-semibold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Welcome to EvaSearchGPT</h3>
              <p className="text-gray-600 max-w-xl mx-auto">
                Ask me anything and I&apos;ll search multiple sources to provide you with the most comprehensive answer.
                Unlike traditional search engines, I synthesize information from various sources to give you complete answers.
              </p>
            </motion.div>
            
            <motion.div 
              className="mt-8 flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center px-4 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Multi-source search
              </div>
              <div className="flex items-center px-4 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI-powered analysis
              </div>
              <div className="flex items-center px-4 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Conversational context
              </div>
            </motion.div>
          </div>
          
          <SearchHints onHintClick={handleSearch} />
        </motion.div>
      )}
    </div>
  );
}
