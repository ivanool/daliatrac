import React from 'react';
import { useTheme } from '../App';
import './FinancialTable.css';

interface FinancialTableProps {
  title: string;
  data: Record<string, number>;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  maxItems?: number;
}

const FinancialTable: React.FC<FinancialTableProps> = ({ 
  title, 
  data, 
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  maxItems
}) => {
  const { theme } = useTheme();
  
  const formatFinancialLabel = (key: string): string => {
    // Mapeo de traducciones de inglés a español
    const translations: Record<string, string> = {
      // Flujos Financieros
      'operating_cash_flow': 'Flujo de Efectivo Operativo',
      'investing_cash_flow': 'Flujo de Efectivo de Inversión',
      'financing_cash_flow': 'Flujo de Efectivo de Financiamiento',
      'net_cash_flow': 'Flujo de Efectivo Neto',
      'free_cash_flow': 'Flujo de Efectivo Libre',
      'capital_expenditure': 'Gastos de Capital',
      'dividend_payments': 'Pagos de Dividendos',
      
      // Posición Financiera
      'total_assets': 'Activos Totales',
      'current_assets': 'Activos Corrientes',
      'non_current_assets': 'Activos No Corrientes',
      'total_liabilities': 'Pasivos Totales',
      'current_liabilities': 'Pasivos Corrientes',
      'non_current_liabilities': 'Pasivos No Corrientes',
      'shareholders_equity': 'Capital de Accionistas',
      'retained_earnings': 'Utilidades Retenidas',
      'cash_and_equivalents': 'Efectivo y Equivalentes',
      'inventory': 'Inventario',
      'accounts_receivable': 'Cuentas por Cobrar',
      'accounts_payable': 'Cuentas por Pagar',
      'short_term_debt': 'Deuda a Corto Plazo',
      'long_term_debt': 'Deuda a Largo Plazo',
      
      // Resultados Trimestrales
      'revenue': 'Ingresos',
      'gross_profit': 'Utilidad Bruta',
      'operating_income': 'Ingresos Operativos',
      'net_income': 'Utilidad Neta',
      'earnings_per_share': 'Utilidad por Acción',
      'ebitda': 'EBITDA',
      'operating_expenses': 'Gastos Operativos',
      'cost_of_goods_sold': 'Costo de Ventas',
      'research_development': 'Investigación y Desarrollo',
      'selling_admin_expenses': 'Gastos de Venta y Admin.',
      'interest_expense': 'Gastos por Intereses',
      'tax_expense': 'Gastos de Impuestos'
    };

    // Si existe traducción, usarla
    if (translations[key]) {
      return translations[key];
    }

    // Si no existe traducción, formatear la clave original
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
      .substring(0, 30);
  };

  const formatValue = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  const getValueClass = (value: number): string => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  };

  // Si no se especifica maxItems, mostrar todos los datos
  const entries = maxItems ? Object.entries(data).slice(0, maxItems) : Object.entries(data);

  return (
    <div className={`financial-table-widget ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <div className="widget-header">
        <h3 className="widget-title">{title} ({entries.length} campos)</h3>
        {isCollapsible && (
          <button 
            className="collapse-button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expandir' : 'Colapsar'}
          >
            <span className={`collapse-icon ${isCollapsed ? 'collapsed' : 'expanded'}`}>
              ▼
            </span>
          </button>
        )}
      </div>
      
      {(!isCollapsible || !isCollapsed) && (
        <div className="financial-table-content">
          {entries.length > 0 ? (
            <>
              <div className="financial-table-grid">
                {entries.map(([key, value]) => (
                  <div key={key} className="financial-item">
                    <div className="financial-label">{formatFinancialLabel(key)}</div>
                    <div className={`financial-value ${getValueClass(value)}`}>
                      {formatValue(value)}
                    </div>
                  </div>
                ))}
              </div>
              {entries.length > 10 && (
                <div className="scroll-indicator">
                  <span style={{ 
                    fontSize: '11px', 
                    color: 'var(--color-text-secondary)',
                    padding: '8px 20px',
                    display: 'block',
                    textAlign: 'center',
                    borderTop: '1px solid var(--color-border)',
                    background: 'rgba(99, 102, 241, 0.03)'
                  }}>
                    ⬆️ Scroll para ver más datos ⬆️
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="no-data">
              <span className="no-data-text">No hay datos disponibles</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialTable;
