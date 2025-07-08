import { useState } from 'react';
import { motion } from 'framer-motion';
import { SearchResult } from '@/types/search';
import { ExternalLink, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface SourceCardProps {
  source: SearchResult;
}

export default function SourceCard({ source }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Format domain for display
  const formattedDomain = source.domain || 
    (source.url ? new URL(source.url).hostname.replace('www.', '') : 'Unknown source');
    
  // Determine source logo
  const getSourceIcon = () => {
    switch (source.source) {
      case 'brave':
        return '🦁'; // Lion emoji for Brave
      case 'serpapi':
        return '🔍'; // Magnifying glass for SerpAPI
      default:
        return '🌐'; // Globe for unknown/other
    }
  };
  
  return (
    <motion.div 
      className="border rounded-lg p-4 hover:shadow-md transition-all bg-white relative overflow-hidden"
      whileHover={{ y: -2, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-semibold text-sm leading-tight line-clamp-2">{source.title}</h5>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center min-w-[40px] h-5 px-1.5 rounded-full bg-gray-100 text-xs font-medium">
            {Math.round(source.relevanceScore)}%
          </span>
          <span className="text-lg" title={`Source: ${source.source}`}>{getSourceIcon()}</span>
        </div>
      </div>
      
      <div 
        className={`text-sm text-gray-600 mb-3 ${expanded ? '' : 'line-clamp-2'} cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        <p>{source.snippet}</p>
        
        {source.snippet && source.snippet.length > 120 && (
          <button className="text-xs text-blue-500 mt-1 flex items-center hover:underline">
            {expanded ? (
              <>
                <ChevronUp size={12} className="mr-1" /> Show less
              </>
            ) : (
              <>
                <ChevronDown size={12} className="mr-1" /> Show more
              </>
            )}
          </button>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block max-w-[120px] truncate" title={formattedDomain}>
            {formattedDomain}
          </span>
          {source.publishedDate && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(source.publishedDate)}
              </span>
            </>
          )}
        </div>
        
        <motion.a 
          href={source.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ExternalLink size={12} className="mr-1" />
          View
        </motion.a>
      </div>
      
      {/* Image preview if available */}
      {source.imageUrl && (
        <div className="mt-3 pt-3 border-t">
          <div className="w-full h-20 relative overflow-hidden rounded">
            <img 
              src={source.imageUrl} 
              alt={source.title} 
              className="object-cover w-full h-full" 
              loading="lazy" 
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Format date in a readable way
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return 'Unknown date';
  }
}
