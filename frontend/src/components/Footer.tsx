export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img src="/ambipar-logo.png" alt="Ambipar" className="h-8 mb-4" />
            <p className="text-gray-400 text-sm">
              Líder em gestão ambiental e sustentabilidade, promovendo a transformação ecológica.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>0800 117 2020</li>
              <li>+55 (11) 3526-3526</li>
              <li>vendas@ambipar.com</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Acesso Rápido</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <a href="https://ambipar.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Site Oficial
                </a>
              </li>
              <li>
                <a href="https://ambipar.com/ambipar-environment-vertical/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Ambipar Environment
                </a>
              </li>
              <li>
                <a href="https://ambipar.com/ambipar-response-vertical/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Ambipar Response
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Ambipar. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Sistema de Gestão de Normas - Consolidação de Normas Regulatórias
          </p>
        </div>
      </div>
    </footer>
  );
};
