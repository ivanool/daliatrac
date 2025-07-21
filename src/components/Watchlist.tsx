import { useState } from 'react';
import { useTheme } from '../App';

const Watchlist = () => {
  const { theme } = useTheme();
  const [watchlistData, setWatchlistData] = useState([
    {
      symbol: 'TSLA',
      name: 'Tesla Inc',
      price: '$248.45',
      change: '+$12.34',
      changePercent: '+5.2%',
      volume: '45.2M',
      changeClass: 'positive'
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc',
      price: '$182.67',
      change: '-$2.12',
      changePercent: '-1.1%',
      volume: '52.1M',
      changeClass: 'negative'
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      price: '$378.91',
      change: '+$5.67',
      changePercent: '+1.5%',
      volume: '28.9M',
      changeClass: 'positive'
    },
  ]);
  
  const [newSymbol, setNewSymbol] = useState('');

  const addSymbol = () => {
    if (newSymbol.trim()) {
      const newStock = {
        symbol: newSymbol.toUpperCase(),
        name: `${newSymbol.toUpperCase()} Company`,
        price: '$0.00',
        change: '$0.00',
        changePercent: '0.0%',
        volume: '0',
        changeClass: 'positive' as 'positive' | 'negative'
      };
      setWatchlistData([...watchlistData, newStock]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (index: number) => {
    setWatchlistData(watchlistData.filter((_, i) => i !== index));
  };

  return (
    <div className={`watchlist-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <div className="page-content">
        <div className="dashboard-controls">
          <h2 style={{ color: '#fff', fontSize: '20px' }}>Mi Watchlist</h2>
          <div className="widget-controls">
            <input
              type="text"
              className="search-input"
              placeholder="Agregar símbolo..."
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
              style={{ 
                maxWidth: '200px', 
                marginRight: '10px',
                padding: '8px 15px',
                fontSize: '12px'
              }}
            />
            <button className="add-symbol-btn" onClick={addSymbol}>
              Agregar
            </button>
          </div>
        </div>

        <div className="widget">
          <div className="widget-header">
            <h3 className="widget-title">Símbolos Seguidos</h3>
            <button className="widget-menu">⋮</button>
          </div>
          
          {watchlistData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              No tienes símbolos en tu watchlist. Agrega algunos para comenzar.
            </div>
          ) : (
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Símbolo</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Cambio</th>
                  <th>% Cambio</th>
                  <th>Volumen</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {watchlistData.map((stock, index) => (
                  <tr key={index}>
                    <td className="symbol-cell">{stock.symbol}</td>
                    <td>{stock.name}</td>
                    <td>{stock.price}</td>
                    <td className={stock.changeClass}>{stock.change}</td>
                    <td className={`change-cell ${stock.changeClass}`}>{stock.changePercent}</td>
                    <td>{stock.volume}</td>
                    <td>
                      <button
                        onClick={() => removeSymbol(index)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #ff4444',
                          color: '#ff4444',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="widget">
          <div className="widget-header">
            <h3 className="widget-title">Alertas de Precio</h3>
            <button className="widget-menu">⋮</button>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
            <p>Configura alertas para recibir notificaciones cuando tus símbolos alcancen ciertos precios.</p>
            <button className="widget-button" style={{ marginTop: '15px' }}>
              Configurar Alertas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watchlist;
