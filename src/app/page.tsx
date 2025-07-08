import dynamic from 'next/dynamic';
import Image from 'next/image';

// Dynamically import the SearchInterface to avoid SSR issues
const SearchInterface = dynamic(() => import('./components/SearchInterface'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
    </div>
  )
});

export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="/globe.svg"
              alt="EvaSearchGPT Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-3xl font-bold">EvaSearchGPT</h1>
          </div>
          <a
            href="/analytics"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Analytics
          </a>
        </div>
        <p className="text-gray-600 mt-2 text-center">
          AI-powered search across multiple sources for comprehensive answers
        </p>
      </header>
      
      <main className="max-w-5xl mx-auto">
        <SearchInterface />
      </main>
    </div>
  );
}
