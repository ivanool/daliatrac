import { useState } from 'react';
import { useTheme } from '../App';
import './Markets.css';

const Markets = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('acciones');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const marketsData = [
    {
      symbol: 'WALMEX',
      name: 'Walmart de México',
      price: '$52.45',
      change: '+$1.65',
      changePercent: '+3.2%',
      volume: '2.3M',
      marketCap: '987.5B',
      changeClass: 'positive'
    },
    {
      symbol: 'GFNORTEO',
      name: 'Grupo Financiero Banorte',
      price: '$167.89',
      change: '+$3.45',
      changePercent: '+2.1%',
      volume: '1.8M',
      marketCap: '756.2B',
      changeClass: 'positive'
    },
    {
      symbol: 'AMXL',
      name: 'América Móvil',
      price: '$14.67',
      change: '-$0.12',
      changePercent: '-0.8%',
      volume: '5.2M',
      marketCap: '432.1B',
      changeClass: 'negative'
    },
    {
      symbol: 'FEMSA',
      name: 'Fomento Económico Mexicano',
      price: '$89.12',
      change: '+$0.44',
      changePercent: '+0.5%',
      volume: '987K',
      marketCap: '345.7B',
      changeClass: 'positive'
    },
    {
      symbol: 'CEMEX',
      name: 'Cemex',
      price: '$5.23',
      change: '-$0.12',
      changePercent: '-2.3%',
      volume: '3.4M',
      marketCap: '78.9B',
      changeClass: 'negative'
    },
  ];

  const sortTable = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!sortConfig) return marketsData;

    return [...marketsData].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a];
      const bValue = b[sortConfig.key as keyof typeof b];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getSortIndicator = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <span className="sort-indicator">↕</span>;
    }
    return (
      <span className="sort-indicator active">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const tabs = [
    { key: 'acciones', label: 'Acciones' },
    { key: 'divisas', label: 'Divisas' },
    { key: 'commodities', label: 'Commodities' },
  ];

  return (
    <div className={`markets-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <div className="page-content">
        <div className="markets-header">
          <h2 className="page-title">Mercados Financieros</h2>
          <div className="tab-controls">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="markets-table-container">
          <div className="table-header">
            <h3 className="table-title">Principales Acciones Mexicanas</h3>
          </div>
          <table className="markets-table">
            <thead>
              <tr>
                <th onClick={() => sortTable('symbol')}>
                  Símbolo {getSortIndicator('symbol')}
                </th>
                <th onClick={() => sortTable('name')}>
                  Nombre {getSortIndicator('name')}
                </th>
                <th onClick={() => sortTable('price')}>
                  Precio {getSortIndicator('price')}
                </th>
                <th onClick={() => sortTable('change')}>
                  Cambio {getSortIndicator('change')}
                </th>
                <th onClick={() => sortTable('changePercent')}>
                  % Cambio {getSortIndicator('changePercent')}
                </th>
                <th onClick={() => sortTable('volume')}>
                  Volumen {getSortIndicator('volume')}
                </th>
                <th onClick={() => sortTable('marketCap')}>
                  Cap. Mercado {getSortIndicator('marketCap')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedData().map((row, index) => (
                <tr key={index}>
                  <td className="symbol-cell">{row.symbol}</td>
                  <td>{row.name}</td>
                  <td>{row.price}</td>
                  <td className={row.changeClass}>{row.change}</td>
                  <td className={`change-cell ${row.changeClass}`}>{row.changePercent}</td>
                  <td>{row.volume}</td>
                  <td>{row.marketCap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Markets;
