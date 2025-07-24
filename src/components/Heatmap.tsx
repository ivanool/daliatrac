import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Heatmap.css';

interface Asset {
  asset: string;
  change: number;  // Este es el porcentaje de cambio
  price: number;
}

interface HeatmapProps {
  className?: string;
  onAssetClick?: (ticker: string) => void;
}

const Heatmap = ({ className = '', onAssetClick }: HeatmapProps) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHeatmapData();
  }, []);

  const handleAssetClick = (ticker: string) => {
    console.log(`Navegando a la página del activo: ${ticker}`);
    if (onAssetClick) {
      onAssetClick(ticker);
    } else {
      // Fallback: almacenar en localStorage para que otras páginas puedan detectarlo
      localStorage.setItem('selectedTicker', ticker);
      console.log(`Ticker ${ticker} almacenado en localStorage`);
    }
  };

  const loadHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoke<Asset[]>('get_heatmap_data');
      setAssets(data);
    } catch (err) {
      console.error('Error loading heatmap data:', err);
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const getColorClass = (percentage: number): string => {
    if (percentage >= 3) return 'positive-strong';
    if (percentage >= 1) return 'positive-medium';
    if (percentage > 0) return 'positive-weak';
    if (percentage > -1) return 'negative-weak';
    if (percentage > -3) return 'negative-medium';
    return 'negative-strong';
  };

  const getSizeClass = (percentage: number): string => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage >= 4) return 'size-xl';
    if (absPercentage >= 2) return 'size-large';
    if (absPercentage >= 0.8) return 'size-medium';
    return 'size-small';
  };

  const formatPercentage = (percentage: number): string => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  if (loading) {
    return (
      <div className={`heatmap-widget ${className}`}>
        <div className="widget-header">
          <h3>Mapa de Calor IPC</h3>
        </div>
        <div className="heatmap-container">
          <div className="loading-spinner">Cargando datos del mercado...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`heatmap-widget ${className}`}>
        <div className="widget-header">
          <h3>Mapa de Calor IPC</h3>
          <button onClick={loadHeatmapData} className="refresh-button">
            ↻
          </button>
        </div>
        <div className="heatmap-container">
          <div className="error-message">
            Error: {error}
            <button onClick={loadHeatmapData} className="retry-button">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`heatmap-widget ${className}`}>
      <div className="widget-header">
        <h3>Mapa de Calor IPC</h3>
        <button onClick={loadHeatmapData} className="refresh-button">
          ↻
        </button>
      </div>
      <div className="heatmap-container">
        {assets.map((asset) => (
          <div
            key={asset.asset}
            className={`heatmap-item ${getColorClass(asset.change)} ${getSizeClass(asset.change)}`}
            title={`${asset.asset}: ${formatPrice(asset.price)} (${formatPercentage(asset.change)}) - Click para ver detalles`}
            onClick={() => handleAssetClick(asset.asset)}
          >
            <div className="heatmap-symbol">{asset.asset}</div>
            <div className="heatmap-change">{formatPercentage(asset.change)}</div>
            <div className="heatmap-price">{formatPrice(asset.price)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Heatmap;
