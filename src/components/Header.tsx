import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import UserBubble from './UserBubble';
import TickerTape from './TickerTape';
import { getAppState, clearAppState } from '../utils/appState';

interface SearchResult {
  razon_social: string;
  emisoras: string;
  serie: string | null;
  ticker: string;
}

interface UserWithPortfolios {
  id: number;
  username: string;
  email?: string;
  portfolios: Portfolio[];
}

interface Portfolio {
  id: number;
  user_id: number;
  name: string;
  created_at?: string;
}

type PageType = 'dashboard' | 'portfolio' | 'markets' | 'watchlist' | 'assets';

interface HeaderProps {
  activePage: PageType;
  onPageChange: (page: PageType) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentUser: UserWithPortfolios | null;
  currentPortfolio: Portfolio | null;
  onUserChange: (user: UserWithPortfolios) => void;
  onPortfolioChange: (portfolio: Portfolio) => void;
  onCreateUser: () => void;
  onCreatePortfolio: () => void;
  onViewPortfolio: (userId: number, portfolioId: number, userName: string, portfolioName: string) => void;
  onTickerSelect?: (ticker: string) => void;
}

const Header = ({ 
  activePage, 
  onPageChange, 
  searchTerm, 
  onSearchChange, 
  currentUser, 
  currentPortfolio,
  onUserChange, 
  onPortfolioChange,
  onCreateUser, 
  onCreatePortfolio,
  onViewPortfolio,
  onTickerSelect
}: HeaderProps) => {
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSavedState, setHasSavedState] = useState(false);

  // Check if there's saved state
  useEffect(() => {
    const savedState = getAppState();
    const hasState = !!(savedState.selectedTicker || savedState.portfolioSelection || savedState.currentUser);
    setHasSavedState(hasState);
  }, []);

  const handleClearSavedState = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar todas las preferencias guardadas?')) {
      clearAppState();
      setHasSavedState(false);
      // Reload the page to reset to default state
      window.location.reload();
    }
  };

  // Búsqueda en tiempo real
  useEffect(() => {
    if (searchTerm.length > 1) {
      searchTickers(searchTerm);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchTerm]);

  const searchTickers = async (query: string) => {
    setIsSearching(true);
    try {
      const results = await invoke<SearchResult[]>('search_tickers', { query });
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching tickers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTickerSelect = (ticker: string) => {
    if (onTickerSelect) {
      onTickerSelect(ticker);
      onPageChange('assets'); // Navegar automáticamente a la pestaña Assets
    }
    setShowSearchResults(false);
    onSearchChange(''); // Limpiar la búsqueda
  };

  const mockSearchResults = [
    { symbol: 'WALMEX', name: 'Walmart de México' },
    { symbol: 'GFNORTEO', name: 'Grupo Financiero Banorte' },
    { symbol: 'AMXL', name: 'América Móvil' },
    { symbol: 'FEMSA', name: 'Fomento Económico Mexicano' },
  ];

  const filteredResults = searchResults.length > 0 ? searchResults : mockSearchResults.filter(
    item => 
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const navItems = [
    { key: 'dashboard' as PageType, label: 'Dashboard' },
    { key: 'portfolio' as PageType, label: 'Portafolio' },
    { key: 'watchlist' as PageType, label: 'Watchlist' },
  ];

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="logo">Dalia</div>
          {hasSavedState && (
            <button 
              className="clear-state-btn"
              onClick={handleClearSavedState}
              title="Limpiar preferencias guardadas"
              style={{
                background: 'rgba(244, 197, 66, 0.2)',
                border: '1px solid rgba(244, 197, 66, 0.4)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                color: 'var(--makima-gold-dark)',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontWeight: '500'
              }}
            >
              🔄 Reset
            </button>
          )}
        </div>
        
        <div className="search-container">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar símbolos, empresas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
          />
          {showSearchResults && searchTerm && (
            <div className="search-results">
              {isSearching ? (
                <div className="search-loading">Buscando...</div>
              ) : (
                <>
                  {searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                      <div 
                        key={index} 
                        className="search-result-item"
                        onClick={() => handleTickerSelect(result.ticker)}
                      >
                        <div className="search-result-symbol">{result.ticker}</div>
                        <div className="search-result-name">{result.razon_social}</div>
                      </div>
                    ))
                  ) : (
                    filteredResults.map((result, index) => (
                      <div 
                        key={index} 
                        className="search-result-item"
                        onClick={() => handleTickerSelect('symbol' in result ? result.symbol : result.ticker)}
                      >
                        <div className="search-result-symbol">
                          {'symbol' in result ? result.symbol : result.ticker}
                        </div>
                        <div className="search-result-name">
                          {'name' in result ? result.name : result.razon_social}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <a
              key={item.key}
              href="#"
              className={`nav-item ${activePage === item.key ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(item.key);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <UserBubble
          currentUser={currentUser}
          currentPortfolio={currentPortfolio}
          onUserChange={onUserChange}
          onPortfolioChange={onPortfolioChange}
          onCreateUser={onCreateUser}
          onCreatePortfolio={onCreatePortfolio}
          onViewPortfolio={onViewPortfolio}
        />
      </div>
      <TickerTape />
    </header>
  );
};

export default Header;
