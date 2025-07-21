import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from '../App';
import './Portfolio.css';

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
}

interface PortfolioProps {
  userId: number;
  portfolioId: number;
  userName: string;
  portfolioName: string;
  onBackToSelection: () => void;
}

const Portfolio = ({ userId, portfolioId, userName, portfolioName, onBackToSelection }: PortfolioProps) => {
  const [holdings, setHoldings] = useState<HoldingInfo[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  console.log('Portfolio component rendered with props:', {
    userId,
    portfolioId,
    userName,
    portfolioName,
    theme
  });

  useEffect(() => {
    loadAllData();
  }, [portfolioId]);

  const loadAllData = async () => {
    console.log('Starting loadAllData for portfolio:', portfolioId);
    setLoading(true);
    setError(null);
    
    try {
      // Primero verificar si el portafolio existe
      console.log('Checking if portfolio exists...');
      const portfolioExists = await invoke<boolean>('check_portfolio_exists', { portfolioId });
      console.log('Portfolio exists:', portfolioExists);
      
      if (!portfolioExists) {
        throw new Error(`El portafolio con ID ${portfolioId} no existe`);
      }
      
      console.log('Loading portfolio data for ID:', portfolioId);
      
      // Cargar cada sección individualmente para mejor debugging
      console.log('Invoking portfolio stats...');
      const portfolioStats = await invoke<PortfolioStats>('get_portfolio_stats', { portfolioId });
      console.log('Portfolio stats received:', portfolioStats);
      
      console.log('Invoking portfolio holdings...');
      const portfolioHoldings = await invoke<HoldingInfo[]>('get_portfolio_holdings', { portfolioId });
      console.log('Portfolio holdings received:', portfolioHoldings);
      
      console.log('Invoking portfolio transactions...');
      const portfolioTransactions = await invoke<TransactionInfo[]>('get_portfolio_transactions', { portfolioId });
      console.log('Portfolio transactions received:', portfolioTransactions);

      console.log('All portfolio data loaded successfully');

      setStats(portfolioStats);
      setHoldings(portfolioHoldings);
      setTransactions(portfolioTransactions);
    } catch (err) {
      console.error('Error loading portfolio data:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      
      let errorMessage = 'Error al cargar datos del portafolio';
      if (err instanceof Error) {
        errorMessage = `${errorMessage}: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage = `${errorMessage}: ${err}`;
      } else {
        errorMessage = `${errorMessage}: ${JSON.stringify(err)}`;
      }
      
      setError(errorMessage);
    } finally {
      console.log('Setting loading to false');
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

  if (loading) {
    console.log('Portfolio component showing loading state');
    return (
      <div className={`portfolio-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        <div className="portfolio-loading">
          <div className="loading-spinner"></div>
          <p>Cargando datos del portafolio...</p>
          <p style={{ fontSize: '12px', opacity: 0.7 }}>
            Portfolio ID: {portfolioId} | User: {userName}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('Portfolio component showing error state:', error);
    return (
      <div className={`portfolio-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        <div className="portfolio-error">
          <h2>Error al cargar el portafolio</h2>
          <p>{error}</p>
          <p style={{ fontSize: '12px', opacity: 0.7 }}>
            Portfolio ID: {portfolioId} | User: {userName}
          </p>
          <button onClick={loadAllData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  console.log('Portfolio component showing main content');

  return (
    <div className={`portfolio-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      {/* Header del Portafolio */}
      <div className="portfolio-header">
        <div className="header-left">
          <button onClick={onBackToSelection} className="back-button">
            ← Regresar
          </button>
          <div className="portfolio-title">
            <h1>{portfolioName}</h1>
            <p>Usuario: {userName}</p>
          </div>
        </div>
        <div className="header-right">
          <button onClick={loadAllData} className="refresh-button">
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="portfolio-section">
        <h2>Estadísticas del Portafolio</h2>
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Valor Total</h3>
              <p className="stat-value">{formatCurrency(stats.portfolio_value)}</p>
            </div>
            <div className="stat-card">
              <h3>Total Invertido</h3>
              <p className="stat-value">{formatCurrency(stats.total_invested)}</p>
            </div>
            <div className="stat-card">
              <h3>Valor Actual</h3>
              <p className="stat-value">{formatCurrency(stats.current_value)}</p>
            </div>
            <div className="stat-card">
              <h3>P&L Total</h3>
              <p className={`stat-value ${stats.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(stats.total_pnl)}
              </p>
            </div>
            <div className="stat-card">
              <h3>P&L Porcentaje</h3>
              <p className={`stat-value ${stats.total_pnl_percent >= 0 ? 'positive' : 'negative'}`}>
                {formatPercentage(stats.total_pnl_percent)}
              </p>
            </div>
            <div className="stat-card">
              <h3>Efectivo</h3>
              <p className="stat-value">{formatCurrency(stats.cash_balance)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Holdings */}
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
              <span>Costo Total</span>
              <span>P&L</span>
              <span>P&L %</span>
            </div>
            {holdings.map((holding, index) => (
              <div key={index} className="table-row">
                <span className="ticker">{holding.ticker}</span>
                <span>{holding.total_shares.toLocaleString()}</span>
                <span>{formatCurrency(holding.average_price)}</span>
                <span>{formatCurrency(holding.current_price)}</span>
                <span>{formatCurrency(holding.market_value)}</span>
                <span>{formatCurrency(holding.total_cost)}</span>
                <span className={`${(holding.unrealized_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(holding.unrealized_pnl)}
                </span>
                <span className={`${(holding.unrealized_pnl_percent || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentage(holding.unrealized_pnl_percent)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No hay holdings en este portafolio</p>
          </div>
        )}
      </div>

      {/* Transacciones */}
      <div className="portfolio-section">
        <h2>Transacciones Recientes</h2>
        {transactions.length > 0 ? (
          <div className="transactions-table">
            <div className="table-header">
              <span>ID</span>
              <span>Fecha</span>
              <span>Ticker</span>
              <span>Tipo</span>
              <span>Cantidad</span>
              <span>Precio</span>
              <span>Valor Total</span>
            </div>
            {transactions.slice(0, 10).map((transaction) => (
              <div key={transaction.transaction_id} className="table-row">
                <span>{transaction.transaction_id}</span>
                <span>{formatDate(transaction.date)}</span>
                <span className="ticker">{transaction.ticker}</span>
                <span className={`transaction-type ${transaction.transaction_type.toLowerCase()}`}>
                  {transaction.transaction_type}
                </span>
                <span>{transaction.quantity.toLocaleString()}</span>
                <span>{formatCurrency(transaction.price)}</span>
                <span>{formatCurrency(transaction.total_value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No hay transacciones en este portafolio</p>
          </div>
        )}
        {transactions.length > 10 && (
          <div className="show-more">
            <p>Mostrando las 10 transacciones más recientes de {transactions.length} total</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
