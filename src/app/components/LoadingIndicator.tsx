'use client';

import { useState, useEffect } from 'react';

interface LoadingIndicatorProps {
  isLoading: boolean;
  query: string;
}

export default function LoadingIndicator({ isLoading, query }: LoadingIndicatorProps) {
  const [dots, setDots] = useState('.');
  const [progressStep, setProgressStep] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const steps = [
    'Fetching search results',
    'Processing data',
    'Generating answer',
    'Almost there'
  ];

  // Animate the dots
  useEffect(() => {
    if (!isLoading) return;
    
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    
    return () => clearInterval(dotInterval);
  }, [isLoading]);

  // Progress through steps
  useEffect(() => {
    if (!isLoading) return;
    
    const stepInterval = setInterval(() => {
      setProgressStep(prev => (prev < steps.length - 1) ? prev + 1 : prev);
    }, 5000); // Move to next step every 5 seconds
    
    return () => clearInterval(stepInterval);
  }, [isLoading, steps.length]);

  // Track elapsed time
  useEffect(() => {
    if (!isLoading) {
      setTimeElapsed(0);
      return;
    }
    
    const timeInterval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="text-center p-8 rounded-lg shadow-sm bg-white/50 backdrop-blur-sm my-4">
      <div className="flex flex-col items-center justify-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">{steps[progressStep]}{dots}</p>
        <div className="mt-2 text-sm text-gray-500">
          Searching for &quot;{query.substring(0, 40)}{query.length > 40 ? '...' : ''}&quot;
        </div>
        {timeElapsed > 15 && (
          <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md max-w-md">
            <p className="text-sm">
              {timeElapsed > 30 
                ? "This search is taking longer than usual. Our services might be experiencing high demand. Please be patient."
                : "This search is taking a bit longer than expected. Please bear with us."}
            </p>
          </div>
        )}
        <div className="w-full max-w-md mt-4 bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(timeElapsed * 3, 90)}%` }}
          ></div>
        </div>
        <div className="mt-2 text-xs text-gray-400">{timeElapsed}s elapsed</div>
      </div>
    </div>
  );
}
