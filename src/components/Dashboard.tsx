import { useState, useEffect } from 'react';
import { useTheme } from '../App';
import { invoke } from '@tauri-apps/api/core';
import StockChart from './StockChart';
import Heatmap from './Heatmap';
import { getAppState, saveAppState } from '../utils/appState';
import './Dashboard.css';

interface SearchResult {
  razon_social: string;
  emisoras: string;
  serie: string | null;
  ticker: string;
}

const Dashboard = () => {
  const { theme } = useTheme();
  const savedState = getAppState();
  const [selectedTicker, setSelectedTicker] = useState(savedState.selectedTicker || 'NAFTRACISHRS');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState({
    chart: true,
    heatmap: true,
    market: true,
    watchlist: true,
    news: true,
  });

  const handleAssetNavigation = (ticker: string) => {
    console.log(`Dashboard: Navegando a Assets con ticker ${ticker}`);
    // Emitir un evento personalizado que el App.tsx pueda escuchar
    window.dispatchEvent(new CustomEvent('navigateToAssets', { 
      detail: { ticker } 
    }));
  };

  // Cargar el último ticker visto desde el estado centralizado
  useEffect(() => {
    const savedState = getAppState();
    if (savedState.selectedTicker && popularTickers.includes(savedState.selectedTicker)) {
      setSelectedTicker(savedState.selectedTicker);
    }
  }, []);

  // Búsqueda de tickers
  useEffect(() => {
    if (searchQuery.length > 1) {
      searchTickers(searchQuery);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const searchTickers = async (query: string) => {
    try {
      const results = await invoke<SearchResult[]>('search_tickers', { query });
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching tickers:', error);
    }
  };

  // Guardar el ticker seleccionado en el estado centralizado
  const handleTickerChange = (ticker: string) => {
    setSelectedTicker(ticker);
    setSearchQuery('');
    setShowSearchResults(false);
    
    // Guardar en el estado centralizado
    saveAppState({ selectedTicker: ticker });
  };

  const toggleWidget = (widget: string) => {
    setActiveWidgets(prev => ({
      ...prev,
      [widget]: !prev[widget as keyof typeof prev]
    }));
  };

  const popularTickers = [
    'AMXB', 'WALMEX', 'GFNORTEO', 'FEMSA', 'CEMEX', 'KIMBERA', 'GRUMAB', 'ALSEA'
  ];

  const marketStats = [
    { value: '56,248', label: 'IPC', change: '+0.42%', className: 'positive' },
    { value: '2.1B', label: 'Volumen', change: '+15.3%', className: 'positive' },
    { value: '18.45', label: 'USD/MXN', change: '-0.3%', className: 'negative' },
    { value: '11.25%', label: 'TIIE 28', change: '-0.25%', className: 'negative' },
  ];

  const watchlistData = [
    { symbol: 'AMXB', name: 'América Móvil', price: '14.50', change: '+0.75%', volume: '1.2M' },
    { symbol: 'WALMEX', name: 'Wal-Mart de México', price: '64.50', change: '+3.2%', volume: '890K' },
    { symbol: 'GFNORTEO', name: 'Grupo Financiero Banorte', price: '128.30', change: '+2.1%', volume: '650K' },
    { symbol: 'FEMSA', name: 'Fomento Económico Mexicano', price: '98.75', change: '+0.5%', volume: '420K' },
  ];

  const newsItems = [
    { time: '09:30', title: 'Banxico mantiene tasa de referencia en 11.25%', source: 'Reuters México', category: 'monetary' },
    { time: '08:45', title: 'Walmex reporta crecimiento de 8.3% en ventas', source: 'El Economista', category: 'earnings' },
    { time: '07:15', title: 'Peso mexicano se fortalece frente al dólar', source: 'Bloomberg México', category: 'forex' },
    { time: '06:30', title: 'FEMSA anuncia inversión en tecnología', source: 'El Financiero', category: 'corporate' },
    { time: '05:45', title: 'IPC cierra con ganancias moderadas', source: 'Milenio', category: 'market' },
  ];

  return (
    <div className={`dashboard-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <div className="dashboard-controls">
        <h2 className="dashboard-title">Dashboard Principal</h2>
        <div className="widget-controls">
          {Object.entries(activeWidgets).map(([widget, isActive]) => (
            <button
              key={widget}
              className={`widget-button ${isActive ? 'active' : ''}`}
              onClick={() => toggleWidget(widget)}
            >
              {widget === 'chart' && 'Gráfico'}
              {widget === 'heatmap' && 'Mapa Calor'}
              {widget === 'market' && 'Mercado'}
              {widget === 'watchlist' && 'Watchlist'}
              {widget === 'news' && 'Noticias'}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Widget de Gráfico Principal */}
        {activeWidgets.chart && (
          <div className="widget chart-container">
            <div className="widget-header">
              <div className="chart-title-section">
                <h3 className="widget-title">{selectedTicker} - Análisis Técnico</h3>
                <div className="chart-search-container">
                  <input
                    type="text"
                    placeholder="Buscar emisora..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery && setShowSearchResults(true)}
                    onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                    className="chart-search-input"
                  />
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="chart-search-dropdown">
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          className="chart-search-result-item"
                          onClick={() => handleTickerChange(result.ticker)}
                        >
                          <div className="result-ticker">{result.ticker}</div>
                          <div className="result-name">{result.razon_social}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button className="widget-menu">⋮</button>
            </div>
            <StockChart ticker={selectedTicker} />
          </div>
        )}

        {/* Widget de Mapa de Calor */}
        {activeWidgets.heatmap && (
          <Heatmap className="widget" onAssetClick={handleAssetNavigation} />
        )}

        {/* Widget de Resumen de Mercado */}
        {activeWidgets.market && (
          <div className="widget market-widget">
            <div className="widget-header">
              <h3 className="widget-title">Resumen de Mercado</h3>
              <button className="widget-menu">⋮</button>
            </div>
            <div className="market-overview">
              {marketStats.map((stat, index) => (
                <div key={index} className="market-stat">
                  <div className="market-stat-value">{stat.value}</div>
                  <div className="market-stat-label">{stat.label}</div>
                  <div className={`market-stat-change ${stat.className}`}>{stat.change}</div>
                </div>
              ))}
            </div>
            <div className="placeholder-content">
              <div className="placeholder-icon">📊</div>
              <div className="placeholder-text">Datos en tiempo real próximamente</div>
            </div>
          </div>
        )}

        {/* Widget de Watchlist */}
        {activeWidgets.watchlist && (
          <div className="widget watchlist-widget">
            <div className="widget-header">
              <h3 className="widget-title">Mi Watchlist</h3>
              <button className="widget-menu">⋮</button>
            </div>
            <div className="watchlist-container">
              {watchlistData.map((item, index) => (
                <div 
                  key={index} 
                  className="watchlist-item"
                  onClick={() => handleTickerChange(item.symbol)}
                >
                  <div className="watchlist-symbol">
                    <div className="symbol-name">{item.symbol}</div>
                    <div className="company-name">{item.name}</div>
                  </div>
                  <div className="watchlist-data">
                    <div className="price">${item.price}</div>
                    <div className={`change ${item.change.startsWith('+') ? 'positive' : 'negative'}`}>
                      {item.change}
                    </div>
                    <div className="volume">{item.volume}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="placeholder-content">
              <div className="placeholder-icon">⭐</div>
              <div className="placeholder-text">Funcionalidad de watchlist en desarrollo</div>
            </div>
          </div>
        )}

        {/* Widget de Noticias */}
        {activeWidgets.news && (
          <div className="widget news-widget">
            <div className="widget-header">
              <h3 className="widget-title">Noticias del Mercado</h3>
              <button className="widget-menu">⋮</button>
            </div>
            <div className="news-feed">
              {newsItems.map((news, index) => (
                <div key={index} className="news-item">
                  <div className="news-time">{news.time}</div>
                  <div className="news-content">
                    <div className="news-title">{news.title}</div>
                    <div className="news-meta">
                      <span className="news-source">{news.source}</span>
                      <span className={`news-category ${news.category}`}>{news.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="placeholder-content">
              <div className="placeholder-icon">📰</div>
              <div className="placeholder-text">Integración con feeds de noticias próximamente</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
