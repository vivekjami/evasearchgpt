import dynamic from 'next/dynamic';
import Link from 'next/link';

const AnalyticsDashboard = dynamic(() => import('../components/AnalyticsDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
    </div>
  )
});

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">EvaSearchGPT Analytics</h1>
            <Link 
              href="/"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Back to Search
            </Link>
          </div>
        </header>
        
        <main>
          <AnalyticsDashboard />
        </main>
      </div>
    </div>
  );
}
