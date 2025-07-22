import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UserInfo {
  id: number;
  username: string;
  email?: string;
}

interface PortfolioInfo {
  id: number;
  user_id: number;
  name: string;
  created_at?: string;
}

interface UserWithPortfolios {
  id: number;
  username: string;
  email?: string;
  portfolios: PortfolioInfo[];
}

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

type TabType = 'statistics' | 'holdings' | 'transactions';

interface PortfolioProps {
  userId: number;
  portfolioId: number;
  userName: string;
  portfolioName: string;
  onBackToSelection: () => void;
}

const Portfolio = ({ userId, portfolioId, userName, portfolioName, onBackToSelection }: PortfolioProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('statistics');
  const [holdings, setHoldings] = useState<HoldingInfo[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [portfolioInfo, setPortfolioInfo] = useState<PortfolioInfo | null>(null);

  useEffect(() => {
    loadUserAndPortfolioInfo();
    loadData();
  }, [userId, portfolioId, activeTab]);

  const loadUserAndPortfolioInfo = async () => {
    try {
      const users = await invoke<UserWithPortfolios[]>('list_users_with_portfolios');
      const user = users.find(u => u.id === userId);
      if (user) {
        setUserInfo({
          id: user.id,
          username: user.username,
          email: user.email
        });
        
        const portfolio = user.portfolios.find(p => p.id === portfolioId);
        if (portfolio) {
          setPortfolioInfo(portfolio);
        }
      }
    } catch (err) {
      console.error('Error loading user and portfolio info:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'statistics') {
        const portfolioStats = await invoke<PortfolioStats>('get_portfolio_stats', { portfolioId });
        setStats(portfolioStats);
      } else if (activeTab === 'holdings') {
        const portfolioHoldings = await invoke<HoldingInfo[]>('get_portfolio_holdings', { portfolioId });
        setHoldings(portfolioHoldings);
      } else if (activeTab === 'transactions') {
        const portfolioTransactions = await invoke<TransactionInfo[]>('get_portfolio_transactions', { portfolioId });
        setTransactions(portfolioTransactions);
      }
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const getPnLColor = (value: number | null): string => {
    if (value === null) return '#888';
    return value >= 0 ? '#00ff88' : '#ff6b6b';
  };

  const renderStatistics = () => (
    <div className="portfolio-statistics">
      <h3>Estadísticas del Portafolio</h3>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Valor Total del Portafolio</div>
            <div className="stat-value main">{formatCurrency(stats.portfolio_value)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Invertido</div>
            <div className="stat-value">{formatCurrency(stats.total_invested)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Valor Actual</div>
            <div className="stat-value">{formatCurrency(stats.current_value)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">P&L Total</div>
            <div className="stat-value" style={{ color: getPnLColor(stats.total_pnl) }}>
              {formatCurrency(stats.total_pnl)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rendimiento</div>
            <div className="stat-value" style={{ color: getPnLColor(stats.total_pnl_percent) }}>
              {formatPercent(stats.total_pnl_percent)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Efectivo</div>
            <div className="stat-value">{formatCurrency(stats.cash_balance)}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHoldings = () => (
    <div className="portfolio-holdings">
      <h3>Holdings</h3>
      <div className="holdings-table">
        <div className="table-header">
          <div>Ticker</div>
          <div>Acciones</div>
          <div>Precio Promedio</div>
          <div>Precio Actual</div>
          <div>Valor de Mercado</div>
          <div>Costo Total</div>
          <div>P&L No Realizado</div>
          <div>% P&L</div>
        </div>
        {holdings.map((holding) => (
          <div key={holding.ticker} className="table-row">
            <div className="ticker-cell">{holding.ticker}</div>
            <div>{holding.total_shares.toLocaleString()}</div>
            <div>{formatCurrency(holding.average_price)}</div>
            <div>{formatCurrency(holding.current_price)}</div>
            <div>{formatCurrency(holding.market_value)}</div>
            <div>{formatCurrency(holding.total_cost)}</div>
            <div style={{ color: getPnLColor(holding.unrealized_pnl) }}>
              {formatCurrency(holding.unrealized_pnl)}
            </div>
            <div style={{ color: getPnLColor(holding.unrealized_pnl_percent) }}>
              {formatPercent(holding.unrealized_pnl_percent)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="portfolio-transactions">
      <h3>Transacciones</h3>
      <div className="transactions-table">
        <div className="table-header">
          <div>ID</div>
          <div>Fecha</div>
          <div>Ticker</div>
          <div>Tipo</div>
          <div>Cantidad</div>
          <div>Precio</div>
          <div>Valor Total</div>
        </div>
        {transactions.map((transaction) => (
          <div key={transaction.transaction_id} className="table-row">
            <div>{transaction.transaction_id}</div>
            <div>{new Date(transaction.date).toLocaleDateString()}</div>
            <div className="ticker-cell">{transaction.ticker}</div>
            <div className={`transaction-type ${transaction.transaction_type.toLowerCase()}`}>
              {transaction.transaction_type}
            </div>
            <div>{transaction.quantity.toLocaleString()}</div>
            <div>{formatCurrency(transaction.price)}</div>
            <div>{formatCurrency(transaction.total_value)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="portfolio-container">
      <div className="portfolio-user-info">
        <div className="user-portfolio-header">
          <div className="selection-info">
            <h2>{portfolioInfo?.name || portfolioName}</h2>
            <p className="user-name">Usuario: {userInfo?.username || userName}</p>
            {userInfo?.email && (
              <p className="user-email">Email: {userInfo.email}</p>
            )}
            {portfolioInfo?.created_at && (
              <p className="portfolio-created">
                Creado: {new Date(portfolioInfo.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <button onClick={onBackToSelection} className="back-button">
            ← Cambiar Usuario/Portafolio
          </button>
        </div>
      </div>
      
      <div className="portfolio-header">
        <div className="portfolio-tabs">
          <button
            className={`tab ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            Estadísticas
          </button>
          <button
            className={`tab ${activeTab === 'holdings' ? 'active' : ''}`}
            onClick={() => setActiveTab('holdings')}
          >
            Holdings
          </button>
          <button
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transacciones
          </button>
        </div>
      </div>

      <div className="portfolio-content">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : (
          <>
            {activeTab === 'statistics' && renderStatistics()}
            {activeTab === 'holdings' && renderHoldings()}
            {activeTab === 'transactions' && renderTransactions()}
          </>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
