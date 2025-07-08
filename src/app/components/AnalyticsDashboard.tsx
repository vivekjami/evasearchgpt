'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface AnalyticsData {
  searches: number;
  avgResponseTime: number;
  successRate: number;
  topQueries: string[];
  timeSeriesData?: {
    date: string;
    searches: number;
    avgTime: number;
    successRate: number;
  }[];
  sourceDistribution?: {
    name: string;
    value: number;
  }[];
  intentDistribution?: {
    name: string;
    value: number;
  }[];
  errorRates?: {
    date: string;
    errors: number;
  }[];
}

// Sample data for charts if API doesn't provide it
const generateSampleTimeSeriesData = () => {
  const data = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      searches: Math.floor(Math.random() * 50) + 10,
      avgTime: Math.random() * 1000 + 500,
      successRate: Math.random() * 20 + 80,
    });
  }
  return data;
};

const generateSampleSourceDistribution = () => [
  { name: 'Brave', value: 45 },
  { name: 'SerpAPI', value: 35 },
  { name: 'Other', value: 20 },
];

const generateSampleIntentDistribution = () => [
  { name: 'Research', value: 40 },
  { name: 'Technical', value: 30 },
  { name: 'News', value: 15 },
  { name: 'Shopping', value: 15 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        
        // Add sample data for charts if not provided by API
        if (!data.timeSeriesData) {
          data.timeSeriesData = generateSampleTimeSeriesData();
        }
        if (!data.sourceDistribution) {
          data.sourceDistribution = generateSampleSourceDistribution();
        }
        if (!data.intentDistribution) {
          data.intentDistribution = generateSampleIntentDistribution();
        }
        
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
    <motion.div 
      className="p-6 space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Total Searches" 
          value={analytics.searches.toString()} 
          icon="🔍"
          color="blue"
        />
        <MetricCard 
          title="Avg Response Time" 
          value={`${analytics.avgResponseTime.toFixed(2)}ms`} 
          icon="⏱️"
          color="green"
        />
        <MetricCard 
          title="Success Rate" 
          value={`${analytics.successRate.toFixed(1)}%`} 
          icon="✅"
          color="indigo" 
        />
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['overview', 'sources', 'performance', 'queries'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTab === tab 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Search Trends Chart */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Search Trends</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics.timeSeriesData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="searches" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Top Queries */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Popular Queries</h3>
                {analytics.topQueries.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.topQueries.map((query, index) => (
                      <div key={index} className="flex items-center">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center mr-3">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{query}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No queries recorded yet</p>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'sources' && (
            <div className="space-y-6">
              {/* Source Distribution Chart */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Source Distribution</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.sourceDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {analytics.sourceDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} searches`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Intent Distribution Chart */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Query Intent Distribution</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.intentDistribution}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Searches" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Response Time Chart */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Average Response Time</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analytics.timeSeriesData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toFixed(0)} ms`} />
                      <Legend />
                      <Line type="monotone" dataKey="avgTime" name="Response Time" stroke="#00C49F" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Success Rate Chart */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Success Rate Over Time</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analytics.timeSeriesData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="successRate" name="Success Rate" stroke="#0088FE" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'queries' && (
            <div className="space-y-6">
              {/* Advanced Query Analysis */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Query Complexity Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Time</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sources Used</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Simple Queries</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">750ms</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1.2</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">98%</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Complex Research</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1250ms</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2.4</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">92%</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Technical</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1450ms</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2.1</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">88%</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Shopping</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">950ms</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1.8</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">95%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
      <div className="text-center text-xs text-gray-500 pt-6">
        <p>Data is refreshed automatically every 30 seconds</p>
      </div>
    </motion.div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  const getGradient = () => {
    switch (color) {
      case 'blue': return 'from-blue-50 to-blue-100 border-blue-200';
      case 'green': return 'from-green-50 to-green-100 border-green-200';
      case 'indigo': return 'from-indigo-50 to-indigo-100 border-indigo-200';
      default: return 'from-gray-50 to-gray-100 border-gray-200';
    }
  };
  
  return (
    <motion.div 
      className={`rounded-lg border shadow bg-gradient-to-br ${getGradient()} p-6`}
      whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-2">{icon}</span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </motion.div>
  );
}
