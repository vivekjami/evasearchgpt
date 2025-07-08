'use client';

import { ChatMessage as ChatMessageType } from '@/types/chat';
import { SearchResult } from '@/types/search';
import SourceCard from './SourceCard';

interface ChatMessageProps {
  message: ChatMessageType;
  onFollowUpClick?: (question: string) => void;
}

export default function ChatMessage({ message, onFollowUpClick }: ChatMessageProps) {
  if (message.type === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-blue-500 text-white p-4 rounded-lg max-w-3xl">
          <p>{message.content}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-start mb-6">
      <div className="bg-gray-100 p-6 rounded-lg max-w-full w-full">
        {/* AI Response */}
        <div className="prose max-w-none mb-4">
          <p className="text-gray-900">{message.content}</p>
        </div>
        
        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Sources:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {message.sources.map((source: SearchResult, i: number) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>
        )}
        
        {/* Follow-up Questions */}
        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Follow-up Questions:</h4>
            <div className="flex flex-wrap gap-2">
              {message.followUpQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUpClick?.(question)}
                  className="bg-white border border-gray-300 rounded-full px-4 py-1 text-sm hover:bg-gray-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
