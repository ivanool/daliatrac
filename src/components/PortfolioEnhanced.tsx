import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from '../App';
import AddAssetModal from './AddAssetModal';
import './PortfolioEnhanced.css';

interface HoldingInfo {
  ticker: string;
  total_shares: number;
  average_price: number;
  current_price: number | null;
  market_value: number | null;
  total_cost: number;
  unrealized_pnl: number | null;
  unrealized_pnl_percent: number | null;
}

interface PortfolioStats {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  cash_balance: number;
  portfolio_value: number;
}

interface TransactionInfo {
  transaction_id: number;
  ticker: string;
  transaction_type: string;
  quantity: number;
  price: number;
  total_value: number;
  date: string;
  notes?: string;
}

interface PortfolioProps {
  userId: number;
  portfolioId: number;
  userName: string;
  portfolioName: string;
  onBackToSelection?: () => void;
}

interface ChartDataPoint {
  date: string;
  value: number;
}

interface AddCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: number;
  onSuccess: () => void;
}

const AddCashModal = ({ isOpen, onClose, portfolioId, onSuccess }: AddCashModalProps) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Ingrese un monto válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await invoke('add_portfolio_transaction', {
        portfolioId,
        ticker: 'CASH',
        transactionType: 'DEPOSIT',
        quantity: 1,
        price: parseFloat(amount),
        movementType: 'DEPOSIT'
      });
      
      onSuccess();
      onClose();
      setAmount('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar efectivo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Agregar Efectivo</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="amount">Monto *</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notas (opcional)</label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Motivo del depósito..."
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Agregando...' : 'Agregar Efectivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface HoldingActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: HoldingInfo;
  portfolioId: number;
  onSuccess: () => void;
}

const HoldingActionsModal = ({ isOpen, onClose, holding, portfolioId, onSuccess }: HoldingActionsModalProps) => {
  const [action, setAction] = useState<'buy' | 'sell' | 'modify'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || !price || parseFloat(quantity) <= 0 || parseFloat(price) <= 0) {
      setError('Ingrese cantidad y precio válidos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const transactionType = action === 'sell' ? 'SELL' : 'BUY';
      
      await invoke('add_portfolio_transaction', {
        portfolioId,
        ticker: holding.ticker,
        transactionType,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        movementType: transactionType
      });
      
      onSuccess();
      onClose();
      setQuantity('');
      setPrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error al ${action === 'sell' ? 'vender' : 'comprar'} activo`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Acciones - {holding.ticker}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="action-selector">
          <button 
            className={action === 'buy' ? 'active' : ''} 
            onClick={() => setAction('buy')}
          >
            Comprar Más
          </button>
          <button 
            className={action === 'sell' ? 'active' : ''} 
            onClick={() => setAction('sell')}
          >
            Vender
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="quantity">Cantidad *</label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              required
            />
            {action === 'sell' && (
              <small>Máximo disponible: {holding.total_shares.toLocaleString()}</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="price">Precio por Acción *</label>
            <input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
            <small>Precio promedio actual: {holding.average_price.toFixed(2)}</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Procesando...' : (action === 'sell' ? 'Vender' : 'Comprar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SimpleChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
}

const SimpleChart = ({ data, width = 400, height = 200 }: SimpleChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder" style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <p>No hay datos suficientes para mostrar la gráfica</p>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * (width - 60);
    const y = height - 40 - ((point.value - minValue) / valueRange) * (height - 80);
    return `${x + 30},${y}`;
  }).join(' ');

  const isPositive = values[values.length - 1] >= values[0];

  return (
    <div className="simple-chart" style={{ width, height }}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.05"/>
          </linearGradient>
        </defs>
        
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "#10b981" : "#ef4444"}
          strokeWidth="2"
        />
        
        <polyline
          points={`${points} ${width - 30},${height - 40} 30,${height - 40}`}
          fill="url(#chartGradient)"
          stroke="none"
        />
        
        <text x={15} y={20} fill="currentColor" fontSize="12" fontWeight="600">
          ${maxValue.toLocaleString('es-MX')}
        </text>
        <text x={15} y={height - 10} fill="currentColor" fontSize="12" fontWeight="600">
          ${minValue.toLocaleString('es-MX')}
        </text>
      </svg>
    </div>
  );
};

const PortfolioEnhanced = ({ userId: _userId, portfolioId, userName, portfolioName, onBackToSelection }: PortfolioProps) => {
  const [holdings, setHoldings] = useState<HoldingInfo[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddCashModal, setShowAddCashModal] = useState(false);
  const [showHoldingActions, setShowHoldingActions] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<HoldingInfo | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [activeHoldingMenu, setActiveHoldingMenu] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    loadAllData();
  }, [portfolioId]);

  const loadAllData = async () => {
    console.log('Starting loadAllData for portfolio:', portfolioId);
    setLoading(true);
    setError(null);
    
    try {
      // Verificar si el portafolio existe
      const portfolioExists = await invoke<boolean>('check_portfolio_exists', { portfolioId });
      
      if (!portfolioExists) {
        throw new Error(`El portafolio con ID ${portfolioId} no existe`);
      }
      
      // Cargar datos del portafolio
      const [portfolioStats, portfolioHoldings, portfolioTransactions] = await Promise.all([
        invoke<PortfolioStats>('get_portfolio_stats', { portfolioId }),
        invoke<HoldingInfo[]>('get_portfolio_holdings', { portfolioId }),
        invoke<TransactionInfo[]>('get_portfolio_transactions', { portfolioId })
      ]);

      // Generar datos simulados para la gráfica basados en las transacciones
      const chartPoints: ChartDataPoint[] = [];
      let runningValue = 0;
      
      // Simular crecimiento del portafolio basado en transacciones
      portfolioTransactions.slice(-30).forEach((transaction) => {
        if (transaction.transaction_type === 'BUY') {
          runningValue += transaction.total_value;
        } else if (transaction.transaction_type === 'SELL') {
          runningValue -= transaction.total_value;
        }
        
        chartPoints.push({
          date: transaction.date,
          value: Math.max(runningValue, portfolioStats.current_value * (0.8 + Math.random() * 0.4))
        });
      });

      // Si no hay suficientes datos, crear puntos simulados
      if (chartPoints.length < 10) {
        const currentValue = portfolioStats.current_value;
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          chartPoints.push({
            date: date.toISOString(),
            value: currentValue * (0.85 + Math.random() * 0.3)
          });
        }
      }

      setStats(portfolioStats);
      setHoldings(portfolioHoldings);
      setTransactions(portfolioTransactions);
      setChartData(chartPoints);
    } catch (err) {
      console.error('Error loading portfolio data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos del portafolio');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatPercentage = (percentage: number | null) => {
    if (percentage === null) return 'N/A';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleHoldingMenuClick = (ticker: string) => {
    setActiveHoldingMenu(activeHoldingMenu === ticker ? null : ticker);
  };

  const handleHoldingAction = (holding: HoldingInfo) => {
    setSelectedHolding(holding);
    setShowHoldingActions(true);
    setActiveHoldingMenu(null);
  };

  const onModalSuccess = () => {
    loadAllData();
  };

  if (loading) {
    return (
      <div className={`portfolio-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        <div className="portfolio-loading">
          <div className="loading-spinner"></div>
          <p>Cargando datos del portafolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`portfolio-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        <div className="portfolio-error">
          <h2>Error al cargar el portafolio</h2>
          <p>{error}</p>
          <button onClick={loadAllData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 10);

  return (
    <div className={`portfolio-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      {/* Header del Portafolio */}
      <div className="portfolio-header">
        <div className="header-left">
          {onBackToSelection && (
            <button onClick={onBackToSelection} className="back-button">
              ← Regresar
            </button>
          )}
          <div className="portfolio-title">
            <h1>{portfolioName}</h1>
            <p>Usuario: {userName}</p>
          </div>
        </div>
        <div className="header-right">
          <button 
            onClick={() => setShowAddCashModal(true)} 
            className="action-button cash-button"
          >
            💰 Agregar Cash
          </button>
          <button 
            onClick={() => setShowAddAssetModal(true)} 
            className="action-button asset-button"
          >
            📈 Agregar Activo
          </button>
          <button onClick={loadAllData} className="refresh-button">
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas Principales */}
      <div className="portfolio-section">
        <h2>Resumen del Portafolio</h2>
        {stats && (
          <div className="stats-grid">
            <div className="stat-card highlight">
              <h3>Valor Total</h3>
              <p className="stat-value large">{formatCurrency(stats.portfolio_value)}</p>
            </div>
            <div className="stat-card">
              <h3>P&L Total</h3>
              <p className={`stat-value ${stats.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(stats.total_pnl)}
              </p>
              <small className={stats.total_pnl_percent >= 0 ? 'positive' : 'negative'}>
                {formatPercentage(stats.total_pnl_percent)}
              </small>
            </div>
            <div className="stat-card">
              <h3>Efectivo Disponible</h3>
              <p className="stat-value">{formatCurrency(stats.cash_balance)}</p>
            </div>
            <div className="stat-card">
              <h3>Total Invertido</h3>
              <p className="stat-value">{formatCurrency(stats.total_invested)}</p>
            </div>
            <div className="stat-card">
              <h3>Valor Actual</h3>
              <p className="stat-value">{formatCurrency(stats.current_value)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Gráfica del Valor del Portafolio */}
      <div className="portfolio-section">
        <h2>Evolución del Valor</h2>
        <div className="chart-container">
          <SimpleChart data={chartData} width={800} height={300} />
        </div>
      </div>

      {/* Holdings con Menús de Acciones */}
      <div className="portfolio-section">
        <h2>Holdings</h2>
        {holdings.length > 0 ? (
          <div className="holdings-table">
            <div className="table-header">
              <span>Ticker</span>
              <span>Acciones</span>
              <span>Precio Promedio</span>
              <span>Precio Actual</span>
              <span>Valor de Mercado</span>
              <span>P&L</span>
              <span>P&L %</span>
              <span>Acciones</span>
            </div>
            {holdings.map((holding, index) => (
              <div key={index} className="table-row">
                <span className="ticker">{holding.ticker}</span>
                <span>{holding.total_shares.toLocaleString()}</span>
                <span>{formatCurrency(holding.average_price)}</span>
                <span>{formatCurrency(holding.current_price)}</span>
                <span>{formatCurrency(holding.market_value)}</span>
                <span className={`${(holding.unrealized_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(holding.unrealized_pnl)}
                </span>
                <span className={`${(holding.unrealized_pnl_percent || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentage(holding.unrealized_pnl_percent)}
                </span>
                <span className="actions-cell">
                  <div className="holdings-actions">
                    <button 
                      className="menu-button"
                      onClick={() => handleHoldingMenuClick(holding.ticker)}
                    >
                      ⋯
                    </button>
                    {activeHoldingMenu === holding.ticker && (
                      <div className="actions-menu">
                        <button onClick={() => handleHoldingAction(holding)}>
                          ➕ Agregar
                        </button>
                        <button onClick={() => handleHoldingAction(holding)}>
                          ➖ Vender
                        </button>
                        <button onClick={() => handleHoldingAction(holding)}>
                          ✏️ Modificar
                        </button>
                      </div>
                    )}
                  </div>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No hay holdings en este portafolio</p>
            <button 
              onClick={() => setShowAddAssetModal(true)}
              className="action-button asset-button"
            >
              📈 Agregar tu primer activo
            </button>
          </div>
        )}
      </div>

      {/* Transacciones */}
      <div className="portfolio-section">
        <div className="section-header">
          <h2>Transacciones</h2>
          {transactions.length > 10 && (
            <button 
              className="toggle-button"
              onClick={() => setShowAllTransactions(!showAllTransactions)}
            >
              {showAllTransactions ? 'Mostrar menos' : `Ver todas (${transactions.length})`}
            </button>
          )}
        </div>
        {transactions.length > 0 ? (
          <div className="transactions-table">
            <div className="table-header">
              <span>Fecha</span>
              <span>Ticker</span>
              <span>Tipo</span>
              <span>Cantidad</span>
              <span>Precio</span>
              <span>Valor Total</span>
            </div>
            {displayedTransactions.map((transaction) => (
              <div key={transaction.transaction_id} className="table-row">
                <span>{formatDate(transaction.date)}</span>
                <span className="ticker">{transaction.ticker}</span>
                <span className={`transaction-type ${transaction.transaction_type.toLowerCase()}`}>
                  {transaction.transaction_type}
                </span>
                <span>{transaction.quantity.toLocaleString()}</span>
                <span>{formatCurrency(transaction.price)}</span>
                <span className={transaction.transaction_type === 'SELL' ? 'positive' : ''}>
                  {formatCurrency(transaction.total_value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No hay transacciones en este portafolio</p>
          </div>
        )}
      </div>

      {/* Modales */}
      <AddAssetModal
        isOpen={showAddAssetModal}
        onClose={() => setShowAddAssetModal(false)}
        onAssetAdded={onModalSuccess}
      />

      <AddCashModal
        isOpen={showAddCashModal}
        onClose={() => setShowAddCashModal(false)}
        portfolioId={portfolioId}
        onSuccess={onModalSuccess}
      />

      {selectedHolding && (
        <HoldingActionsModal
          isOpen={showHoldingActions}
          onClose={() => {
            setShowHoldingActions(false);
            setSelectedHolding(null);
          }}
          holding={selectedHolding}
          portfolioId={portfolioId}
          onSuccess={onModalSuccess}
        />
      )}
    </div>
  );
};

export default PortfolioEnhanced;
