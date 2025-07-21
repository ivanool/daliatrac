import { useState, useEffect, createContext, useContext } from "react";
import { invoke } from '@tauri-apps/api/core';
import "./App.css";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import PortfolioEnhanced from "./components/PortfolioEnhanced";
import Markets from "./components/Markets";
import Watchlist from "./components/Watchlist";
import Assets from "./components/Assets";
import UserPortfolioSelector from "./components/UserPortfolioSelector";
import CreateUserModal from "./components/CreateUserModal";
import CreatePortfolioModal from "./components/CreatePortfolioModal";

interface UserWithPortfolios {
  id: number;
  username: string;
  email?: string;
  portfolios: PortfolioType[];
}

interface PortfolioType {
  id: number;
  user_id: number;
  name: string;
  created_at?: string;
}

type PageType = 'dashboard' | 'portfolio' | 'markets' | 'watchlist' | 'assets';

interface PortfolioSelection {
  userId: number;
  portfolioId: number;
  userName: string;
  portfolioName: string;
}

// Theme context y provider
export type Theme = "light" | "dark";
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});
export const useTheme = () => useContext(ThemeContext);

function App() {
  const [activePage, setActivePage] = useState<PageType>('dashboard');
  const [searchTerm, setSearchTerm] = useState("");
  const [portfolioSelection, setPortfolioSelection] = useState<PortfolioSelection | null>(null);
  const [currentUser, setCurrentUser] = useState<UserWithPortfolios | null>(null);
  const [currentPortfolio, setCurrentPortfolio] = useState<PortfolioType | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreatePortfolioModal, setShowCreatePortfolioModal] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [selectedTicker, setSelectedTicker] = useState<string>('WALMEX');
  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  // Load first user automatically
  useEffect(() => {
    loadFirstUser();
  }, []);

  useEffect(() => {
    document.body.className = theme === "dark" ? "theme-dark" : "theme-light";
  }, [theme]);

  const loadFirstUser = async () => {
    try {
      const users = await invoke<UserWithPortfolios[]>('list_users_with_portfolios');
      if (users.length > 0) {
        const firstUser = users[0];
        setCurrentUser(firstUser);
        // Auto-seleccionar el primer portafolio si existe
        if (firstUser.portfolios.length > 0) {
          setCurrentPortfolio(firstUser.portfolios[0]);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleUserChange = (user: UserWithPortfolios) => {
    setCurrentUser(user);
    // Auto-seleccionar el primer portafolio si existe
    if (user.portfolios.length > 0) {
      setCurrentPortfolio(user.portfolios[0]);
    } else {
      setCurrentPortfolio(null);
    }
    // Reset portfolio selection when user changes
    setPortfolioSelection(null);
  };

  const handlePortfolioChange = (portfolio: PortfolioType) => {
    setCurrentPortfolio(portfolio);
    // Reset portfolio selection when portfolio changes
    setPortfolioSelection(null);
  };

  const handleViewPortfolio = (userId: number, portfolioId: number, userName: string, portfolioName: string) => {
    setPortfolioSelection({ userId, portfolioId, userName, portfolioName });
    setActivePage('portfolio');
  };

  const handleCreateUser = () => {
    setShowCreateUserModal(true);
  };

  const handleCreatePortfolio = () => {
    setShowCreatePortfolioModal(true);
  };

  const handleUserCreated = () => {
    loadFirstUser(); // Reload users after creating a new one
  };

  const handlePortfolioCreated = () => {
    loadFirstUser(); // Reload users to get updated portfolios
  };

  const handlePortfolioSelectionComplete = (userId: number, portfolioId: number, userName: string, portfolioName: string) => {
    setPortfolioSelection({ userId, portfolioId, userName, portfolioName });
  };

  const handleTickerSelect = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'portfolio':
        // Priorizar portfolioSelection si existe (desde "Ver Portafolio")
        if (portfolioSelection) {
          return (
            <PortfolioEnhanced
              userId={portfolioSelection.userId}
              portfolioId={portfolioSelection.portfolioId}
              userName={portfolioSelection.userName}
              portfolioName={portfolioSelection.portfolioName}
              onBackToSelection={() => setActivePage('dashboard')}
            />
          );
        }
        // Si hay un portafolio seleccionado en la burbuja, mostrarlo
        else if (currentUser && currentPortfolio) {
          return (
            <PortfolioEnhanced 
              userId={currentUser.id}
              portfolioId={currentPortfolio.id}
              userName={currentUser.username}
              portfolioName={currentPortfolio.name}
              onBackToSelection={() => setActivePage('dashboard')}
            />
          );
        } else {
          // Si no hay selección, mostrar el selector
          return <UserPortfolioSelector onSelectionComplete={handlePortfolioSelectionComplete} />;
        }
      case 'markets':
        return <Markets />;
      case 'watchlist':
        return <Watchlist />;
      case 'assets':
        return <Assets selectedTicker={selectedTicker} />;
      default:
        return <Dashboard />;
    }
  };

  const handlePageChange = (page: PageType) => {
    // Reset portfolio selection when changing pages
    if (page !== 'portfolio') {
      setPortfolioSelection(null);
    }
    setActivePage(page);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`app ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
        <Header 
          activePage={activePage}
          onPageChange={handlePageChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          currentUser={currentUser}
          currentPortfolio={currentPortfolio}
          onUserChange={handleUserChange}
          onPortfolioChange={handlePortfolioChange}
          onCreateUser={handleCreateUser}
          onCreatePortfolio={handleCreatePortfolio}
          onViewPortfolio={handleViewPortfolio}
          onTickerSelect={handleTickerSelect}
        />
        <div className="main-container">
          {renderPage()}
        </div>

        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onUserCreated={handleUserCreated}
        />

        <CreatePortfolioModal
          isOpen={showCreatePortfolioModal}
          onClose={() => setShowCreatePortfolioModal(false)}
          onPortfolioCreated={handlePortfolioCreated}
          userId={currentUser?.id || 0}
          userName={currentUser?.username || ''}
        />
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
