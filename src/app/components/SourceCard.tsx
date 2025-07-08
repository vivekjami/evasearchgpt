import { SearchResult } from '@/types/search';
import { ExternalLink, Clock } from 'lucide-react';

interface SourceCardProps {
  source: SearchResult;
}

export default function SourceCard({ source }: SourceCardProps) {
  // Format domain for display
  const formattedDomain = source.domain || 
    (source.url ? new URL(source.url).hostname.replace('www.', '') : 'Unknown source');
  
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-semibold text-sm leading-tight line-clamp-2">{source.title}</h5>
        <span className="inline-flex items-center justify-center min-w-[40px] h-5 px-1.5 ml-2 rounded-full bg-gray-100 text-xs font-medium">
          {Math.round(source.relevanceScore)}%
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {source.snippet}
      </p>
      
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
        
        <a 
          href={source.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          <ExternalLink size={12} className="mr-1" />
          View
        </a>
      </div>
    </div>
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
