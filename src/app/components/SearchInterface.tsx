'use client';

import { useState, useCallback } from 'react';
import { SearchQuery, AIResponse } from '@/types/search';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import ChatMessage from './ChatMessage';

export default function SearchInterface() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
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
          timestamp: new Date().toISOString()
        }
      ]);
      
    } catch (error) {
      console.error('Search failed:', error);
      
      setMessages(prev => [...prev, 
        {
          type: 'user',
          content: searchQuery,
          timestamp: new Date().toISOString()
        }, 
        {
          type: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  }, []);
  
  const handleFollowUpQuestion = useCallback((question: string) => {
    setQuery(question);
    handleSearch(question);
  }, [handleSearch]);
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Search Input */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="Ask me anything..."
            className="w-full px-4 py-3 border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-2 bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="space-y-6">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            message={message} 
            onFollowUpClick={handleFollowUpQuestion}
          />
        ))}
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="text-center p-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Searching multiple sources...</p>
        </div>
      )}
      
      {/* Empty State */}
      {messages.length === 0 && !isLoading && (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Welcome to EvaSearchGPT</h3>
          <p className="text-gray-600 mb-4">Ask me anything and I'll search multiple sources for the best answer.</p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Try asking:</p>
            <button 
              onClick={() => handleSearch("What are the latest developments in quantum computing?")}
              className="block w-full text-left px-4 py-2 bg-white rounded border hover:bg-gray-50"
            >
              "What are the latest developments in quantum computing?"
            </button>
            <button 
              onClick={() => handleSearch("How do solar panels work?")}
              className="block w-full text-left px-4 py-2 bg-white rounded border hover:bg-gray-50"
            >
              "How do solar panels work?"
            </button>
            <button 
              onClick={() => handleSearch("What is the best way to learn React?")}
              className="block w-full text-left px-4 py-2 bg-white rounded border hover:bg-gray-50"
            >
              "What is the best way to learn React?"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
