import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Modal.css';

interface Portfolio {
  id: number;
  user_id: number;
  name: string;
  created_at?: string;
}

interface UserWithPortfolios {
  id: number;
  username: string;
  email?: string;
  portfolios: Portfolio[];
}

interface TickerInfo {
  ticker: string;
  emisora: string;
  serie?: string;
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetAdded: () => void;
  selectedTicker?: string;
}

const AddAssetModal = ({ isOpen, onClose, onAssetAdded, selectedTicker }: AddAssetModalProps) => {
  const [users, setUsers] = useState<UserWithPortfolios[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [ticker, setTicker] = useState(selectedTicker || '');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [movementType, setMovementType] = useState('BUY');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickerSuggestions, setTickerSuggestions] = useState<TickerInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTicker) {
      setTicker(selectedTicker);
    }
  }, [selectedTicker]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await invoke<UserWithPortfolios[]>('list_users_with_portfolios');
      setUsers(response);
      
      // Auto-seleccionar primer usuario si existe
      if (response.length > 0) {
        setSelectedUserId(response[0].id);
        if (response[0].portfolios.length > 0) {
          setSelectedPortfolioId(response[0].portfolios[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const searchTickers = async (query: string) => {
    if (query.length < 2) {
      setTickerSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const suggestions = await invoke<TickerInfo[]>('search_valid_tickers', { query });
      setTickerSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Error searching tickers:', err);
      setTickerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleTickerChange = (value: string) => {
    setTicker(value.toUpperCase());
    searchTickers(value);
  };

  const selectTicker = (tickerInfo: TickerInfo) => {
    setTicker(tickerInfo.ticker);
    setShowSuggestions(false);
    setTickerSuggestions([]);
  };

  const handleUserChange = (userId: number) => {
    setSelectedUserId(userId);
    const user = users.find(u => u.id === userId);
    if (user && user.portfolios.length > 0) {
      setSelectedPortfolioId(user.portfolios[0].id);
    } else {
      setSelectedPortfolioId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPortfolioId || !ticker.trim() || !quantity || !price) {
      setError('Todos los campos son requeridos');
      return;
    }

    if (parseInt(quantity) <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (parseFloat(price) <= 0) {
      setError('El precio debe ser mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await invoke('add_portfolio_movement_command', {
        portfolioId: selectedPortfolioId,
        ticker: ticker.trim().toUpperCase(),
        quantity: parseInt(quantity),
        price: parseFloat(price),
        movementType: movementType
      });
      
      onAssetAdded();
      onClose();
      
      // Reset form
      setTicker(selectedTicker || '');
      setQuantity('');
      setPrice('');
      setMovementType('BUY');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar activo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTicker(selectedTicker || '');
    setQuantity('');
    setPrice('');
    setMovementType('BUY');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const selectedUser = users.find(u => u.id === selectedUserId);
  const selectedPortfolio = selectedUser?.portfolios.find(p => p.id === selectedPortfolioId);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Agregar Activo al Portafolio</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {loadingUsers ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              Cargando usuarios...
            </div>
          ) : (
            <>
              {/* Selector de Usuario */}
              <div className="form-group">
                <label htmlFor="user">Usuario *</label>
                <select
                  id="user"
                  value={selectedUserId || ''}
                  onChange={e => handleUserChange(parseInt(e.target.value))}
                  disabled={loading}
                  required
                >
                  <option value="">Seleccionar usuario</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.portfolios.length} portafolio{user.portfolios.length !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Portafolio */}
              <div className="form-group">
                <label htmlFor="portfolio">Portafolio *</label>
                <select
                  id="portfolio"
                  value={selectedPortfolioId || ''}
                  onChange={e => setSelectedPortfolioId(parseInt(e.target.value))}
                  disabled={loading || !selectedUserId || !selectedUser?.portfolios.length}
                  required
                >
                  <option value="">Seleccionar portafolio</option>
                  {selectedUser?.portfolios.map(portfolio => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Información del portafolio seleccionado */}
              {selectedUser && selectedPortfolio && (
                <div className="user-info-display">
                  <div className="user-avatar-display">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <div className="user-name-display">{selectedUser.username}</div>
                    <div className="user-id-display">{selectedPortfolio.name}</div>
                  </div>
                </div>
              )}

              {/* Ticker */}
              <div className="form-group">
                <label htmlFor="ticker">Ticker *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="ticker"
                    type="text"
                    value={ticker}
                    onChange={e => handleTickerChange(e.target.value)}
                    placeholder="Ej: WALMEX*, AMXB, etc."
                    disabled={loading}
                    required
                  />
                  {showSuggestions && tickerSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}>
                      {tickerSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => selectTicker(suggestion)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: index < tickerSuggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                            fontSize: '14px'
                          }}
                          onMouseEnter={e => {
                            (e.target as HTMLElement).style.background = 'var(--color-hover)';
                          }}
                          onMouseLeave={e => {
                            (e.target as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <div style={{ fontWeight: '500', color: 'var(--color-text)' }}>
                            {suggestion.ticker}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {suggestion.emisora}{suggestion.serie ? ` • Serie: ${suggestion.serie}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tipo de Movimiento */}
              <div className="form-group">
                <label htmlFor="movementType">Tipo de Operación *</label>
                <select
                  id="movementType"
                  value={movementType}
                  onChange={e => setMovementType(e.target.value)}
                  disabled={loading}
                >
                  <option value="BUY">Compra</option>
                  <option value="SELL">Venta</option>
                </select>
              </div>

              {/* Cantidad */}
              <div className="form-group">
                <label htmlFor="quantity">Cantidad *</label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="Número de acciones"
                  disabled={loading}
                  required
                />
              </div>

              {/* Precio */}
              <div className="form-group">
                <label htmlFor="price">Precio por Acción (MXN) *</label>
                <input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="Ej: 25.50"
                  disabled={loading}
                  required
                />
              </div>

              {/* Mostrar total */}
              {quantity && price && (
                <div className="form-group">
                  <div style={{ 
                    background: 'var(--color-bg)', 
                    padding: '12px 16px', 
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px'
                  }}>
                    <strong>Total: ${(parseFloat(price) * parseInt(quantity || '0')).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</strong>
                  </div>
                </div>
              )}

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={handleClose}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !selectedPortfolioId || !ticker.trim() || !quantity || !price}
                >
                  {loading ? 'Agregando...' : `${movementType === 'BUY' ? 'Comprar' : 'Vender'} Activo`}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;
