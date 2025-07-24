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
import { saveAppState, getAppState, AppState, clearAppState } from "./utils/appState";

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
  // Load saved state from localStorage
  const savedState = getAppState();
  
  const [activePage, setActivePage] = useState<PageType>(savedState.activePage as PageType || 'dashboard');
  const [searchTerm, setSearchTerm] = useState("");
  const [portfolioSelection, setPortfolioSelection] = useState<PortfolioSelection | null>(savedState.portfolioSelection || null);
  const [currentUser, setCurrentUser] = useState<UserWithPortfolios | null>(null);
  const [currentPortfolio, setCurrentPortfolio] = useState<PortfolioType | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreatePortfolioModal, setShowCreatePortfolioModal] = useState(false);
  const [theme, setTheme] = useState<Theme>(savedState.theme as Theme || "light");
  const [selectedTicker, setSelectedTicker] = useState<string>(savedState.selectedTicker || 'WALMEX');
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    saveAppState({ theme: newTheme });
  };

  // Load first user automatically and restore state
  useEffect(() => {
    loadFirstUser();
  }, []);

  useEffect(() => {
    document.body.className = theme === "dark" ? "theme-dark" : "theme-light";
  }, [theme]);

  // Restore user and portfolio from saved state after loading users
  useEffect(() => {
    if (currentUser && savedState.currentUser && savedState.currentPortfolio) {
      // Try to find the saved user and portfolio
      const savedUserId = savedState.currentUser.id;
      const savedPortfolioId = savedState.currentPortfolio.id;
      
      if (currentUser.id === savedUserId) {
        const savedPortfolio = currentUser.portfolios.find(p => p.id === savedPortfolioId);
        if (savedPortfolio) {
          setCurrentPortfolio(savedPortfolio);
        }
      }
    }
  }, [currentUser]);

  // Listener para navegación desde el heatmap
  useEffect(() => {
    const handleNavigateToAssets = (event: CustomEvent) => {
      const { ticker } = event.detail;
      console.log(`App: Recibido evento navigateToAssets con ticker ${ticker}`);
      setSelectedTicker(ticker);
      setActivePage('assets');
      // Save the new state
      saveAppState({ 
        selectedTicker: ticker, 
        activePage: 'assets' 
      });
    };

    window.addEventListener('navigateToAssets', handleNavigateToAssets as EventListener);
    
    return () => {
      window.removeEventListener('navigateToAssets', handleNavigateToAssets as EventListener);
    };
  }, []);

  const loadFirstUser = async () => {
    try {
      const users = await invoke<UserWithPortfolios[]>('list_users_with_portfolios');
      if (users.length > 0) {
        const savedState = getAppState();
        let userToSelect = users[0];
        
        // Try to restore the previously selected user
        if (savedState.currentUser) {
          const savedUser = users.find(u => u.id === savedState.currentUser!.id);
          if (savedUser) {
            userToSelect = savedUser;
          }
        }
        
        setCurrentUser(userToSelect);
        
        // Auto-seleccionar el portafolio guardado o el primero si existe
        if (userToSelect.portfolios.length > 0) {
          let portfolioToSelect = userToSelect.portfolios[0];
          
          if (savedState.currentPortfolio) {
            const savedPortfolio = userToSelect.portfolios.find(p => p.id === savedState.currentPortfolio!.id);
            if (savedPortfolio) {
              portfolioToSelect = savedPortfolio;
            }
          }
          
          setCurrentPortfolio(portfolioToSelect);
          
          // Save the restored state
          saveAppState({
            currentUser: {
              id: userToSelect.id,
              username: userToSelect.username,
              email: userToSelect.email
            },
            currentPortfolio: {
              id: portfolioToSelect.id,
              user_id: portfolioToSelect.user_id,
              name: portfolioToSelect.name
            }
          });
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
    
    // Save user selection
    saveAppState({
      currentUser: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      currentPortfolio: user.portfolios.length > 0 ? {
        id: user.portfolios[0].id,
        user_id: user.portfolios[0].user_id,
        name: user.portfolios[0].name
      } : undefined,
      portfolioSelection: undefined
    });
  };

  const handlePortfolioChange = (portfolio: PortfolioType) => {
    setCurrentPortfolio(portfolio);
    // Reset portfolio selection when portfolio changes
    setPortfolioSelection(null);
    
    // Save portfolio selection
    saveAppState({
      currentPortfolio: {
        id: portfolio.id,
        user_id: portfolio.user_id,
        name: portfolio.name
      },
      portfolioSelection: undefined
    });
  };

  const handleViewPortfolio = (userId: number, portfolioId: number, userName: string, portfolioName: string) => {
    const selection = { userId, portfolioId, userName, portfolioName };
    setPortfolioSelection(selection);
    setActivePage('portfolio');
    
    // Save portfolio selection and page
    saveAppState({
      portfolioSelection: selection,
      activePage: 'portfolio'
    });
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
    const selection = { userId, portfolioId, userName, portfolioName };
    setPortfolioSelection(selection);
    
    // Save portfolio selection
    saveAppState({
      portfolioSelection: selection
    });
  };

  const handleTickerSelect = (ticker: string) => {
    setSelectedTicker(ticker);
    
    // Save ticker selection
    saveAppState({
      selectedTicker: ticker
    });
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
      saveAppState({ portfolioSelection: undefined });
    }
    setActivePage(page);
    
    // Save active page
    saveAppState({
      activePage: page
    });
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
