'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const AnalyticsDashboard = dynamic(() => import('../components/AnalyticsDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col justify-center items-center min-h-[50vh]">
      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
      <p className="mt-4 text-gray-600">Loading analytics data...</p>
    </div>
  )
});

export default function ClientAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <motion.header 
          className="mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Image
                src="/file.svg"
                alt="Analytics"
                width={28}
                height={28}
                className="mr-3"
              />
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Track search performance and user engagement
                </p>
              </div>
            </div>
            
            <motion.div
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href="/"
                className="flex items-center px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Search
              </Link>
            </motion.div>
          </div>
          
          <div className="mt-6 border-b border-gray-200 pb-4">
            <div className="flex space-x-2 text-sm text-gray-500">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Real-time data
              </span>
            </div>
          </div>
        </motion.header>
        
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <AnalyticsDashboard />
          </div>
        </motion.main>
        
        <motion.footer 
          className="mt-12 text-center text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <p>Data is collected anonymously and used only to improve search quality.</p>
        </motion.footer>
      </div>
    </div>
  );
}
