'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion } from 'framer-motion';

// Dynamically import the SearchInterface to avoid SSR issues
const SearchInterface = dynamic(() => import('./components/SearchInterface'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col justify-center items-center min-h-[50vh]">
      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
      <p className="mt-4 text-gray-600">Initializing search engine...</p>
    </div>
  )
});

export default function ClientHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-12">
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2
              }}
            >
              <Image
                src="/globe.svg"
                alt="EvaSearchGPT Logo"
                width={50}
                height={50}
                className="mr-3"
              />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                EvaSearchGPT
              </h1>
              <p className="text-gray-600 mt-1">
                Search the web with AI-powered insights and analysis
              </p>
            </div>
          </div>
          
          <motion.a
            href="/analytics"
            className="flex items-center px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
            whileHover={{ y: -3, backgroundColor: "#f0f9ff" }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="mr-2 font-medium text-blue-600">Analytics</span>
            <Image src="/file.svg" alt="Analytics" width={18} height={18} />
          </motion.a>
        </motion.div>
        
        <motion.div
          className="mt-6 max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="bg-blue-600 text-white px-4 py-2 rounded-full inline-flex items-center text-sm font-medium mb-4">
            <span className="mr-1">✨</span>
            <span>Search multiple sources at once for comprehensive answers</span>
          </div>
        </motion.div>
      </header>
      
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <SearchInterface />
      </motion.main>
      
      <motion.footer 
        className="absolute bottom-0 left-0 right-0 p-6 text-center text-gray-500 text-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="flex justify-center items-center space-x-4">
          <span>© 2025 EvaSearchGPT</span>
          <span className="w-1 h-1 rounded-full bg-gray-400"></span>
          <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
          <span className="w-1 h-1 rounded-full bg-gray-400"></span>
          <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
          <span className="w-1 h-1 rounded-full bg-gray-400"></span>
          <a href="#" className="hover:text-blue-600 transition-colors">About</a>
        </div>
      </motion.footer>
    </div>
  );
}
