import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-[#005bb3] text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo e Título */}
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

            {/* Navigation Links e User Menu */}
            <div className="flex items-center gap-6">
              {/* Navigation Links */}
              <div className="flex gap-2">
                <Link
                  to="/normas"
                  className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
                >
                  Normas
                </Link>
                <Link
                  to="/analytics"
                  className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
                >
                  Análises
                </Link>
                {isAdmin && (
                  <Link
                    to="/usuarios"
                    className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
                  >
                    Usuários
                  </Link>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-4 border-l border-white/30 pl-6">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {user?.nome_completo}
                  </p>
                  <p className="text-xs text-white/70">
                    {user?.tipo_usuario === 'admin' ? 'Administrador' : 'Usuário'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
