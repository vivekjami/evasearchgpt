'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  searches: number;
  avgResponseTime: number;
  successRate: number;
  topQueries: string[];
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalytics();
    
    // Refresh analytics every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-2">Loading analytics...</p>
      </div>
    );
  }
  
  if (!analytics) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-lg">
        <p>Failed to load analytics data. Please try again later.</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Performance Dashboard</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Total Searches" 
          value={analytics.searches.toString()} 
          icon="🔍" 
        />
        <MetricCard 
          title="Avg Response Time" 
          value={`${analytics.avgResponseTime.toFixed(2)}ms`} 
          icon="⏱️" 
        />
        <MetricCard 
          title="Success Rate" 
          value={`${analytics.successRate.toFixed(1)}%`} 
          icon="✅" 
        />
      </div>
      
      {/* Top Queries */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Popular Queries</h3>
        {analytics.topQueries.length > 0 ? (
          <ul className="list-disc list-inside">
            {analytics.topQueries.map((query, index) => (
              <li key={index} className="mb-2 text-gray-700">{query}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No queries recorded yet</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center mb-2">
        <span className="text-2xl mr-2">{icon}</span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
