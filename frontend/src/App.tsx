import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import NormasPage from './pages/NormasPage';
import AnalyticsPage from './pages/AnalyticsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            style: {
              background: '#065f46',
              color: '#fff',
              border: '1px solid #10b981',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            style: {
              background: '#991b1b',
              color: '#fff',
              border: '1px solid #ef4444',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation */}
          <nav className="bg-ambipar-blue-600 text-white shadow-lg">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <img 
                    src="/ambipar-logo.png" 
                    alt="Ambipar" 
                    className="h-10 md:h-12 brightness-0 invert" 
                  />
                  <div className="border-l border-white/30 pl-6">
                    <h1 className="text-2xl md:text-3xl font-bold">Sistema de Gestão de Normas</h1>
                    <p className="text-sm mt-1 opacity-90">Consolidação de Normas Regulatórias</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/"
                    className="px-4 py-2 text-sm font-medium text-white hover:bg-ambipar-blue-700 rounded-md transition-colors"
                  >
                    Normas
                  </Link>
                  <Link
                    to="/analytics"
                    className="px-4 py-2 text-sm font-medium text-white hover:bg-ambipar-blue-700 rounded-md transition-colors"
                  >
                    Análises
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Routes */}
          <Routes>
            <Route path="/" element={<NormasPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
