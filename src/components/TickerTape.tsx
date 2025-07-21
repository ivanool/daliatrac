import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './TickerTape.css';

interface TickerData {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
}

interface TickerTapeProps {
  onTickerClick?: (symbol: string) => void;
}

const TickerTape = ({ onTickerClick }: TickerTapeProps) => {
  const [tickerData, setTickerData] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickerData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchTickerData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchTickerData = async () => {
    try {
      const data = await invoke<TickerData[]>('get_ticker_data');
      setTickerData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching ticker data:', err);
      setError('Error loading market data');
      // Usar datos de ejemplo si hay error
      setTickerData([
        { symbol: 'IPC', price: 56248.32, change: 0, change_percent: 0.42 },
        { symbol: 'USD/MXN', price: 18.45, change: 0, change_percent: -0.30 },
        { symbol: 'WALMEX', price: 64.50, change: 0, change_percent: 3.2 },
        { symbol: 'GFNORTEO', price: 128.30, change: 0, change_percent: 2.1 },
        { symbol: 'AMXB', price: 14.50, change: 0, change_percent: 0.75 },
        { symbol: 'FEMSA', price: 98.75, change: 0, change_percent: 0.5 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTickerClick = (symbol: string) => {
    if (onTickerClick) {
      onTickerClick(symbol);
    }
  };

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('/')) {
      return price.toFixed(2);
    }
    return price >= 1000 ? price.toFixed(0) : price.toFixed(2);
  };

  const formatChange = (changePercent: number) => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="ticker-tape">
        <div className="ticker-content loading">
          <div className="ticker-item">
            <span className="ticker-symbol">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ticker-tape">
      <div className="ticker-content">
        {/* Duplicamos los datos para crear un loop infinito */}
        {[...tickerData, ...tickerData].map((ticker, index) => (
          <div 
            key={`${ticker.symbol}-${index}`}
            className="ticker-item"
            onClick={() => handleTickerClick(ticker.symbol)}
          >
            <span className="ticker-symbol">{ticker.symbol}</span>
            <span className="ticker-price">
              {ticker.symbol.includes('/') ? '' : '$'}{formatPrice(ticker.price, ticker.symbol)}
            </span>
            <span className={`ticker-change ${ticker.change_percent >= 0 ? 'positive' : 'negative'}`}>
              {formatChange(ticker.change_percent)}
            </span>
          </div>
        ))}
      </div>
      {error && (
        <div className="ticker-error" title={error}>
          ⚠️
        </div>
      )}
    </div>
  );
};

export default TickerTape;
