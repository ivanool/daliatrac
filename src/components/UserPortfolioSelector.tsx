import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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

interface UserPortfolioSelectorProps {
  onSelectionComplete: (userId: number, portfolioId: number, userName: string, portfolioName: string) => void;
}

const UserPortfolioSelector = ({ onSelectionComplete }: UserPortfolioSelectorProps) => {
  const [users, setUsers] = useState<UserWithPortfolios[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsersWithPortfolios = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await invoke<UserWithPortfolios[]>('list_users_with_portfolios');
        console.log('Users with portfolios:', response);
        
        setUsers(response);
      } catch (err) {
        console.error('Error fetching users with portfolios:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar usuarios y portafolios');
      } finally {
        setLoading(false);
      }
    };

    fetchUsersWithPortfolios();
  }, []);

  const selectedUser = users.find(user => user.id === selectedUserId);
  const selectedPortfolio = selectedUser?.portfolios.find(portfolio => portfolio.id === selectedPortfolioId);

  const handleUserChange = (userId: number) => {
    setSelectedUserId(userId);
    setSelectedPortfolioId(null); // Reset portfolio selection
  };

  const handlePortfolioChange = (portfolioId: number) => {
    setSelectedPortfolioId(portfolioId);
  };

  const handleContinue = () => {
    if (selectedUserId && selectedPortfolioId && selectedUser && selectedPortfolio) {
      onSelectionComplete(selectedUserId, selectedPortfolioId, selectedUser.username, selectedPortfolio.name);
    }
  };

  if (loading) {
    return (
      <div className="user-portfolio-selector">
        <div className="selector-container">
          <div className="selector-header">
            <h2>Cargando usuarios y portafolios...</h2>
          </div>
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-portfolio-selector">
        <div className="selector-container">
          <div className="selector-header">
            <h2>Error</h2>
          </div>
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="user-portfolio-selector">
        <div className="selector-container">
          <div className="selector-header">
            <h2>No hay usuarios disponibles</h2>
          </div>
          <p>No se encontraron usuarios con portafolios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-portfolio-selector">
      <div className="selector-container">
        <div className="selector-header">
          <h2>Seleccionar Usuario y Portafolio</h2>
          <p>Elige un usuario y luego selecciona uno de sus portafolios para continuar.</p>
        </div>

        <div className="selection-section">
          <div className="form-group">
            <label htmlFor="user-select">Usuario:</label>
            <select
              id="user-select"
              value={selectedUserId || ''}
              onChange={(e) => handleUserChange(Number(e.target.value))}
              className="form-select"
            >
              <option value="">-- Seleccionar Usuario --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.portfolios.length} portafolio{user.portfolios.length !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {selectedUserId && selectedUser && (
            <div className="form-group">
              <label htmlFor="portfolio-select">Portafolio:</label>
              <select
                id="portfolio-select"
                value={selectedPortfolioId || ''}
                onChange={(e) => handlePortfolioChange(Number(e.target.value))}
                className="form-select"
              >
                <option value="">-- Seleccionar Portafolio --</option>
                {selectedUser.portfolios.map(portfolio => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedUserId && selectedPortfolioId && (
          <div className="selection-summary">
            <h3>Selección actual:</h3>
            <div className="summary-item">
              <span className="label">Usuario:</span>
              <span className="value">{selectedUser?.username}</span>
            </div>
            <div className="summary-item">
              <span className="label">Portafolio:</span>
              <span className="value">{selectedPortfolio?.name}</span>
            </div>
            
            <button onClick={handleContinue} className="continue-button">
              Ver Portafolio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPortfolioSelector;
