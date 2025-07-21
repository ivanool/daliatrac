import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from '../App';
import './UserBubble.css';

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

interface UserBubbleProps {
  currentUser: UserWithPortfolios | null;
  currentPortfolio: Portfolio | null;
  onUserChange: (user: UserWithPortfolios) => void;
  onPortfolioChange: (portfolio: Portfolio) => void;
  onCreateUser: () => void;
  onCreatePortfolio: () => void;
  onViewPortfolio: (userId: number, portfolioId: number, userName: string, portfolioName: string) => void;
}

const UserBubble = ({ 
  currentUser, 
  currentPortfolio,
  onUserChange, 
  onPortfolioChange,
  onCreateUser, 
  onCreatePortfolio,
  onViewPortfolio 
}: UserBubbleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserWithPortfolios[]>([]);
  const [, setSelectedPortfolioId] = useState<number | null>(currentPortfolio?.id || null);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await invoke<UserWithPortfolios[]>('list_users_with_portfolios');
      setUsers(response);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: UserWithPortfolios) => {
    onUserChange(user);
    // Auto-seleccionar el primer portafolio si existe
    if (user.portfolios.length > 0) {
      const firstPortfolio = user.portfolios[0];
      setSelectedPortfolioId(firstPortfolio.id);
      onPortfolioChange(firstPortfolio);
    } else {
      setSelectedPortfolioId(null);
    }
    setIsOpen(false);
  };

  const handlePortfolioSelect = (portfolio: Portfolio) => {
    setSelectedPortfolioId(portfolio.id);
    onPortfolioChange(portfolio);
  };

  const handleViewPortfolio = () => {
    if (currentUser && currentPortfolio) {
      onViewPortfolio(currentUser.id, currentPortfolio.id, currentUser.username, currentPortfolio.name);
      setIsOpen(false);
    }
  };

  return (
    <div className={`user-bubble ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}> 
      <button 
        className="user-bubble-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-avatar">
          {currentUser?.username?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="user-info">
          <div className="user-name">
            {currentUser?.username || 'Sin usuario'}
          </div>
          <div className="user-portfolios">
            {currentPortfolio ? currentPortfolio.name : `${currentUser?.portfolios?.length || 0} portafolio${(currentUser?.portfolios?.length || 0) !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="dropdown-arrow">
          {isOpen ? '▲' : '▼'}
        </div>
      </button>

      {isOpen && (
        <div className="user-dropdown">
          {/* Theme Toggle */}
          <div className="dropdown-theme-toggle">
            <span className="theme-toggle-label">Modo</span>
            <button 
              className="theme-toggle-btn"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? '🌙 Noche' : '☀️ Día'}
            </button>
          </div>

          <div className="dropdown-header">
            <h3>Usuario</h3>
          </div>
          
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.7 }}>
              Cargando usuarios...
            </div>
          ) : (
            <>
              <div className="user-list">
                {users.map(user => (
                  <button
                    key={user.id}
                    className={`user-item ${currentUser?.id === user.id ? 'active' : ''}`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="user-name">{user.username}</div>
                    <div className="user-portfolios">
                      {user.portfolios.length} portafolio{user.portfolios.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              </div>

              {currentUser && currentUser.portfolios.length > 0 && (
                <>
                  <div className="dropdown-header">
                    <h3>Portafolios</h3>
                  </div>
                  <div className="portfolio-list">
                    {currentUser.portfolios.map(portfolio => (
                      <button
                        key={portfolio.id}
                        className={`portfolio-item ${currentPortfolio?.id === portfolio.id ? 'active' : ''}`}
                        onClick={() => handlePortfolioSelect(portfolio)}
                      >
                        <div className="portfolio-name">{portfolio.name}</div>
                        <div className="portfolio-id">ID: {portfolio.id}</div>
                      </button>
                    ))}
                  </div>
                  
                  {currentPortfolio && (
                    <div className="portfolio-actions">
                      <button 
                        className="view-portfolio"
                        onClick={handleViewPortfolio}
                      >
                        Ver {currentPortfolio.name}
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="dropdown-actions">
                <button 
                  className="action-button primary"
                  onClick={() => {
                    onCreateUser();
                    setIsOpen(false);
                  }}
                >
                  + Usuario
                </button>
                <button 
                  className="action-button secondary"
                  onClick={() => {
                    onCreatePortfolio();
                    setIsOpen(false);
                  }}
                  disabled={!currentUser}
                >
                  + Portafolio
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserBubble;
