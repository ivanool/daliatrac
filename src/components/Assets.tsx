import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from '../App';
import FinancialTable from './FinancialTable';
import StockChart from './StockChart';
import AddAssetModal from './AddAssetModal';
import './Assets.css';

interface SearchResult {
  razon_social: string;
  emisoras: string;
  serie: string | null;
  ticker: string;
}

interface AssetDetails {
  razon_social: string;
  emisoras: string;
  serie: string;
  tipo_valor: string | null;
  intradia: {
    price: number;
    open: number;
    volume: number;
    change: number;
    change_percent: number;
  };
  finantial_flow: Record<string, number>;
  finantial_position: Record<string, number>;
  quarter_result: Record<string, number>;
  trimestres_disponibles: string[];
  historical_prices: { date: string; close: number | null }[];
}

interface AssetsProps {
  selectedTicker?: string;
}

const Assets = ({ selectedTicker: initialTicker }: AssetsProps) => {
  const { theme } = useTheme();
  const [selectedTicker, setSelectedTicker] = useState<string>(initialTicker || 'WALMEX');
  const [assetDetails, setAssetDetails] = useState<AssetDetails | null>(null);
  const [selectedTrimestre, setSelectedTrimestre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'flujos' | 'position' | 'results'>('analysis');
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);

  // Actualizar ticker cuando se recibe uno nuevo desde el componente padre
  useEffect(() => {
    if (initialTicker && initialTicker !== selectedTicker) {
      setSelectedTicker(initialTicker);
    }
  }, [initialTicker]);

  useEffect(() => {
    if (selectedTicker) {
      fetchAssetDetails(selectedTicker, selectedTrimestre);
    }
    // eslint-disable-next-line
  }, [selectedTicker, selectedTrimestre]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      searchTickers(searchQuery);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const fetchAssetDetails = async (ticker: string, trimestre?: string | null) => {
    try {
      console.log(`=== FETCHING ASSET DETAILS FOR: ${ticker} ===`);
      const details = await invoke<AssetDetails>('get_asset_details', {
        ticker: ticker,
        trimestre: trimestre
      });
      console.log('Asset details received:', details);
      setAssetDetails(details);
      
      // Si es la primera carga y no hay trimestre seleccionado, usar el último disponible
      if (!selectedTrimestre && details.trimestres_disponibles && details.trimestres_disponibles.length > 0) {
        const lastTrimestre = details.trimestres_disponibles[details.trimestres_disponibles.length - 1];
        console.log(`Setting default trimestre: ${lastTrimestre}`);
        setSelectedTrimestre(lastTrimestre);
      }
    } catch (error) {
      console.error('Error fetching asset details:', error);
    }
  };

  const searchTickers = async (query: string) => {
    try {
      const results = await invoke<SearchResult[]>('search_tickers', { query });
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching tickers:', error);
    }
  };

  const handleTickerSelect = (ticker: string) => {
    console.log(`=== TICKER SELECTED: ${ticker} ===`);
    setSelectedTicker(ticker);
    setSearchQuery('');
    setShowSearchResults(false);
    // Forzar la llamada inmediatamente
    fetchAssetDetails(ticker);
  };

  const getTickerDisplay = (ticker: string) => {
    return ticker.replace('.MX', '');
  };

  const handleAddAsset = () => {
    setShowAddAssetModal(true);
  };

  const handleAssetAdded = () => {
    // Podrías agregar lógica aquí para actualizar datos si es necesario
    console.log('Asset added successfully!');
  };

  return (
    <div className={`assets-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      {/* Layout principal */}
      <div className="main-content">
        {/* Sección superior: Gráfica + Datos intradia */}
        <div className="top-section">
          {/* Panel de gráfico */}
          <div className="chart-section">
            <div className="chart-header">
              <div className="chart-title-group">
                <h3 className="chart-title">{getTickerDisplay(selectedTicker)} - Análisis Técnico</h3>
                <div className="ticker-search">
                  <input
                    type="text"
                    placeholder="Buscar emisora..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery && setShowSearchResults(true)}
                    onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                    className="search-input"
                  />
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="search-dropdown">
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          className="search-result-item"
                          onClick={() => handleTickerSelect(result.ticker)}
                        >
                          <div className="result-ticker">{result.ticker}</div>
                          <div className="result-name">{result.razon_social}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Selector de trimestre */}
                {assetDetails && assetDetails.trimestres_disponibles.length > 0 && (
                  <div className="trimestre-selector">
                    <select
                      value={selectedTrimestre || ''}
                      onChange={(e) => {
                        setSelectedTrimestre(e.target.value);
                        // Re-fetch data with new trimestre
                        fetchAssetDetails(selectedTicker, e.target.value);
                      }}
                      className="trimestre-select"
                    >
                      <option value="">Seleccionar trimestre</option>
                      {assetDetails.trimestres_disponibles.map((trimestre) => (
                        <option key={trimestre} value={trimestre}>
                          {trimestre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Botón Agregar Activo */}
                <button
                  onClick={handleAddAsset}
                  className="add-asset-button"
                  title="Agregar este activo al portafolio"
                >
                  + Agregar a Portafolio
                </button>
              </div>
            </div>
            
            <div className="chart-container">
              <StockChart 
                ticker={selectedTicker} 
                height={560}
                compact={false}
              />
            </div>
          </div>

          {/* Panel de datos intradia */}
          <div className="intradia-panel">
            {assetDetails ? (
              <>
                <div className="company-header">
                  <div className="company-name">{assetDetails.razon_social}</div>
                  <div className="ticker-symbol">{getTickerDisplay(selectedTicker)}</div>
                </div>
                
                <div className="price-section">
                  <div className="current-price">
                    ${assetDetails.intradia.price.toFixed(2)}
                  </div>
                  <div className={`price-change ${assetDetails.intradia.change_percent >= 0 ? 'positive' : 'negative'}`}>
                    {assetDetails.intradia.change_percent >= 0 ? '+' : ''}{assetDetails.intradia.change_percent.toFixed(2)}%
                    <span className="change-amount">
                      ({assetDetails.intradia.change_percent >= 0 ? '+' : ''}${assetDetails.intradia.change.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="intradia-metrics">
                  <div className="metric-row">
                    <span className="metric-label">Apertura:</span>
                    <span className="metric-value">${assetDetails.intradia.open.toFixed(2)}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Volumen:</span>
                    <span className="metric-value">
                      {assetDetails.intradia.volume >= 1000000
                        ? `${(assetDetails.intradia.volume / 1000000).toFixed(1)}M`
                        : assetDetails.intradia.volume >= 1000
                        ? `${(assetDetails.intradia.volume / 1000).toFixed(1)}K`
                        : assetDetails.intradia.volume.toString()
                      }
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Tipo:</span>
                    <span className="metric-value">{assetDetails.tipo_valor || 'Acción'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>Cargando datos...</span>
              </div>
            )}
          </div>
        </div>

        {/* Sección inferior: Tabs financieros */}
        <div className="financial-section">
          <div className="financial-tabs">
            <button 
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              Análisis
            </button>
            <button 
              className={`tab-button ${activeTab === 'flujos' ? 'active' : ''}`}
              onClick={() => setActiveTab('flujos')}
            >
              Flujos Financieros
            </button>
            <button 
              className={`tab-button ${activeTab === 'position' ? 'active' : ''}`}
              onClick={() => setActiveTab('position')}
            >
              Datos Financieros
            </button>
            <button 
              className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              Resultados Trimestrales
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'analysis' && (
              <div className="analysis-content">
                <div className="analysis-placeholder">
                  <div className="placeholder-icon">📊</div>
                  <div className="placeholder-text">Herramientas de análisis próximamente</div>
                </div>
              </div>
            )}

            {activeTab === 'flujos' && assetDetails && (
              <div className="financial-content">
                <FinancialTable
                  title="Flujos Financieros"
                  data={assetDetails.finantial_flow}
                  isCollapsible={false}
                />
              </div>
            )}

            {activeTab === 'position' && assetDetails && (
              <div className="financial-content">
                <FinancialTable
                  title="Posición Financiera"
                  data={assetDetails.finantial_position}
                  isCollapsible={false}
                />
              </div>
            )}

            {activeTab === 'results' && assetDetails && (
              <div className="financial-content">
                <FinancialTable
                  title="Resultados Trimestrales"
                  data={assetDetails.quarter_result}
                  isCollapsible={false}
                />
              </div>
            )}

            {!assetDetails && activeTab !== 'analysis' && (
              <div className="loading-content">
                <div className="loading-spinner"></div>
                <span>Cargando datos financieros...</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal para agregar activo */}
      <AddAssetModal
        isOpen={showAddAssetModal}
        onClose={() => setShowAddAssetModal(false)}
        onAssetAdded={handleAssetAdded}
        selectedTicker={selectedTicker}
      />
    </div>
  );
};

export default Assets;
