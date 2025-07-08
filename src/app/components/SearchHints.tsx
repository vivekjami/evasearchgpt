'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchHintsProps {
  onHintClick: (hint: string) => void;
}

const HINTS_BY_CATEGORY = {
  research: [
    "What are the latest developments in quantum computing?",
    "How does climate change affect biodiversity?",
    "Explain the theory of multiple intelligences"
  ],
  technical: [
    "How does blockchain technology work?",
    "What's the difference between machine learning and deep learning?",
    "Explain how HTTPS encryption works"
  ],
  news: [
    "Latest advancements in renewable energy",
    "Recent developments in space exploration",
    "Current trends in artificial intelligence"
  ],
  practical: [
    "How to improve focus and productivity",
    "Best practices for learning a new language",
    "Tips for sustainable living"
  ]
};

export default function SearchHints({ onHintClick }: SearchHintsProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof HINTS_BY_CATEGORY>('research');

  return (
    <motion.div 
      className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 my-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-medium mb-4">Need inspiration? Try searching for:</h3>
      
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(HINTS_BY_CATEGORY).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category as keyof typeof HINTS_BY_CATEGORY)}
            className={`px-3 py-1 text-sm rounded-full transition-all ${
              activeCategory === category
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Hints grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          className="grid gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
        >
          {HINTS_BY_CATEGORY[activeCategory].map((hint) => (
            <motion.button
              key={hint}
              onClick={() => onHintClick(hint)}
              className="text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all"
              whileHover={{ y: -1, x: 1 }}
              whileTap={{ scale: 0.98 }}
            >
              {hint}
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>
      
      <div className="mt-4 text-xs text-gray-400 text-right">
        Click any suggestion to search
      </div>
    </motion.div>
  );
}
