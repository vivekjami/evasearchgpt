'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { SearchResult } from '@/types/search';
import SourceCard from '@/app/components/SourceCard';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

// Confidence bar component to avoid inline styles
const ConfidenceBar = ({ confidence }: { confidence: number }) => {
  // Use classes instead of inline styles
  const widthClasses = {
    0: 'w-0',
    10: 'w-[10%]',
    20: 'w-[20%]',
    30: 'w-[30%]',
    40: 'w-[40%]',
    50: 'w-[50%]',
    60: 'w-[60%]',
    70: 'w-[70%]',
    80: 'w-[80%]',
    90: 'w-[90%]',
    100: 'w-full',
  };

  // Find the closest key in widthClasses
  const getWidthClass = (value: number) => {
    const keys = Object.keys(widthClasses).map(Number);
    const closest = keys.reduce((prev, curr) => 
      (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev)
    );
    return widthClasses[closest as keyof typeof widthClasses];
  };

  return (
    <div 
      className={`bg-blue-600 h-1.5 rounded-full absolute top-0 left-0 ${getWidthClass(confidence)}`}
      data-confidence={confidence}
    />
  );
};

interface ChatMessageProps {
  message: ChatMessageType;
  onFollowUpClick?: (question: string) => void;
}

export default function ChatMessage({ message, onFollowUpClick }: ChatMessageProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (message.type === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <motion.div 
          className="bg-blue-500 text-white p-4 rounded-lg max-w-3xl shadow-sm"
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p>{message.content}</p>
        </motion.div>
      </div>
    );
  }
  
  // Format processing time for display
  const formatTime = (time?: number) => {
    if (!time) return '';
    return time < 1000 
      ? `${time.toFixed(0)}ms` 
      : `${(time / 1000).toFixed(2)}s`;
  };
  
  return (
    <div className="flex justify-start mb-6">
      <motion.div 
        className="bg-gray-100 p-6 rounded-lg max-w-full w-full shadow-sm"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* AI Response */}
        <div className="prose max-w-none mb-4 text-gray-900">
          <div className="markdown-content">
            <ReactMarkdown 
              rehypePlugins={[rehypeSanitize, rehypeRaw]} 
              remarkPlugins={[remarkGfm]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        
        {/* Performance Metrics */}
        {(message.processingTime || message.confidence || message.queryIntent) && (
          <div className="mt-2 mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs flex items-center text-gray-500 hover:text-gray-700"
            >
              <span className="mr-1">{showDetails ? '▼' : '►'}</span>
              <span>{showDetails ? 'Hide details' : 'Show details'}</span>
            </button>
            
            {showDetails && (
              <motion.div 
                className="mt-2 p-3 bg-gray-50 rounded-md text-xs space-y-1 text-gray-600"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {message.queryIntent && (
                  <p>Intent: <span className="font-medium">{message.queryIntent}</span></p>
                )}
                {message.processingTime && (
                  <p>Processing time: <span className="font-medium">{formatTime(message.processingTime)}</span></p>
                )}
                {message.confidence && (
                  <div className="flex items-center">
                    <span className="mr-2">Confidence:</span>
                    <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-1.5 mr-2 relative overflow-hidden">
                      <ConfidenceBar confidence={Math.round(message.confidence || 0)} />
                    </div>
                    <span>{Math.round(message.confidence)}%</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
        
        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <motion.div 
            className="mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Sources:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {message.sources.map((source: SearchResult, idx) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + (idx * 0.1) }}
                >
                  <SourceCard source={source} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Follow-up Questions */}
        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Follow-up Questions:
            </h4>
            <div className="flex flex-wrap gap-2">
              {message.followUpQuestions.map((question, i) => (
                <motion.button
                  key={i}
                  onClick={() => onFollowUpClick?.(question)}
                  className="bg-white border border-gray-300 rounded-full px-4 py-2 text-sm hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + (i * 0.1) }}
                >
                  {question}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
