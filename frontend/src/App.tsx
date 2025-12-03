import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import NormasPage from './pages/NormasPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsuariosPage from './pages/UsuariosPage';
import ScrapersPage from './pages/ScrapersPage';
import CrawlersPrioridade from './pages/CrawlersPrioridade';

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
      <AuthProvider>
        <Toaster 
          position="top-center"
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
          <Routes>
            {/* Rota pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rotas protegidas */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/normas" element={<NormasPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/scrapers" element={<ScrapersPage />} />
              <Route path="/crawlers" element={<CrawlersPrioridade />} />
              
              {/* Rota apenas para admin */}
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute requireAdmin>
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Redirect raiz para normas */}
            <Route path="/" element={<Navigate to="/normas" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
