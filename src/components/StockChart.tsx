import { useState, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { invoke } from '@tauri-apps/api/core';
import './StockChart.css';

interface DailyClose {
  date: string;
  close: number | null;
}

interface ChartDataPoint {
  x: string;
  y: number;
}

interface ChartData {
  id: string;
  data: ChartDataPoint[];
}

type TimePeriod = 1 | 3 | 6 | 12;

interface StockChartProps {
  ticker?: string;
  height?: string | number;
  compact?: boolean;
}

const StockChart = ({ ticker = 'AMXB', height = '500px', compact = false }: StockChartProps) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(6);

  const timePeriods: { value: TimePeriod; label: string }[] = [
    { value: 1, label: '1M' },
    { value: 3, label: '3M' },
    { value: 6, label: '6M' },
    { value: 12, label: '1Y' }
  ];

  const fetchData = async (months: TimePeriod) => {
    try {
      setLoading(true);
      console.log(`Fetching historical data for ${ticker} (${months} months)...`);
      
      const data: DailyClose[] = await invoke('get_historical_data', {
        ticker: ticker,
        months: months
      });

      console.log('Historical data received:', data);

      const validData = data
        .filter(item => item.close !== null && item.close > 0)
        .map(item => ({
          x: item.date,
          y: item.close!
        }))
        .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

      if (validData.length === 0) {
        throw new Error('No valid data found');
      }

      const formattedData: ChartData[] = [
        {
          id: ticker,
          data: validData
        }
      ];

      setChartData(formattedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Error al cargar los datos reales. Mostrando datos de ejemplo.');
      
      const fallbackData: ChartData[] = [
        {
          id: ticker,
          data: generateFallbackData(months)
        }
      ];
      setChartData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  // Simulación de datos para demo
  const generateFallbackData = (months: TimePeriod): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const today = new Date();
    const basePrice = 14.50;
    const totalDays = months * 30;
    
    for (let i = totalDays; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const variation = (Math.random() - 0.5) * 2;
      const trend = (totalDays - i) / totalDays * 0.5;
      const price = Math.max(basePrice + variation + (Math.sin(i / 5) * 0.5) + trend, 10);
      
      data.push({
        x: date.toISOString().split('T')[0],
        y: Math.round(price * 100) / 100
      });
    }
    
    return data;
  };

  useEffect(() => {
    fetchData(selectedPeriod);
  }, [selectedPeriod, ticker]);

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: typeof height === 'string' ? height : `${height}px`,
        background: 'linear-gradient(135deg, #1f2937 0%, #111827 50%, #1f2937 100%)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid #3b82f6',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{
            color: '#9ca3af',
            fontSize: '14px'
          }}>Loading chart data...</span>
        </div>
      </div>
    );
  }

  if (chartData.length === 0 || chartData[0].data.length === 0) {
    return (
      <div style={{
        minHeight: typeof height === 'string' ? height : `${height}px`,
        background: 'linear-gradient(135deg, #1f2937 0%, #111827 50%, #1f2937 100%)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
      }}>
        <div style={{
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
          <div>No data available</div>
        </div>
      </div>
    );
  }

  const currentPrice = chartData[0].data[chartData[0].data.length - 1]?.y || 0;
  const firstPrice = chartData[0].data[0]?.y || 0;
  const totalChange = currentPrice - firstPrice;
  const totalChangePercent = firstPrice > 0 ? (totalChange / firstPrice) * 100 : 0;
  const isPositive = totalChange >= 0;

  const minPrice = Math.min(...chartData[0].data.map(d => d.y));
  const maxPrice = Math.max(...chartData[0].data.map(d => d.y));

  return (
    <div 
      className="stock-chart-container"
      style={{
        background: 'linear-gradient(135deg, #1f2937 0%, #111827 50%, #1f2937 100%)',
        borderRadius: '12px',
        padding: compact ? '16px' : '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        height: '100%',
        minHeight: typeof height === 'string' ? height : `${height}px`,
        width: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
      {/* Header con información del stock */}
      <div 
        className="stock-chart-header"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          marginBottom: '24px',
          gap: '16px'
        }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '200px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#2563eb',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>{ticker.charAt(0)}</span>
            </div>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <h2 style={{
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: 0
                }}>{ticker.replace('.MX', '')}</h2>
                <span style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  background: '#1f2937',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>MX</span>
              </div>
              <p style={{
                color: '#9ca3af',
                fontSize: '12px',
                margin: 0
              }}>Mexican Stock Exchange</p>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div>
              <div style={{
                color: 'white',
                fontSize: '32px',
                fontWeight: 'bold'
              }}>
                ${currentPrice.toFixed(2)}
                <span style={{
                  color: '#9ca3af',
                  fontSize: '16px',
                  fontWeight: 'normal',
                  marginLeft: '4px'
                }}>MXN</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: isPositive ? '#10b981' : '#ef4444'
              }}>
                <span style={{ fontSize: '14px' }}>
                  {isPositive ? '▲' : '▼'}
                </span>
                <span style={{ fontWeight: '600' }}>
                  {isPositive ? '+' : ''}{totalChange.toFixed(2)} ({isPositive ? '+' : ''}{totalChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controles de período elegantes */}
        <div 
          className="stock-chart-period-controls"
          style={{
            display: 'flex',
            background: '#1f2937',
            borderRadius: '8px',
            padding: '4px',
            width: 'fit-content'
          }}>
          {timePeriods.map((period) => (
            <button
              key={period.value}
              onClick={() => handlePeriodChange(period.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: selectedPeriod === period.value ? '#2563eb' : 'transparent',
                color: selectedPeriod === period.value ? 'white' : '#9ca3af',
                boxShadow: selectedPeriod === period.value ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (selectedPeriod !== period.value) {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.background = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPeriod !== period.value) {
                  e.currentTarget.style.color = '#9ca3af';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div 
        className="stock-chart-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
        <div style={{
          background: 'rgba(31, 41, 55, 0.5)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{
            color: '#9ca3af',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px'
          }}>High</div>
          <div style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: '600'
          }}>${maxPrice.toFixed(2)}</div>
        </div>
        <div style={{
          background: 'rgba(31, 41, 55, 0.5)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{
            color: '#9ca3af',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px'
          }}>Low</div>
          <div style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: '600'
          }}>${minPrice.toFixed(2)}</div>
        </div>
        <div style={{
          background: 'rgba(31, 41, 55, 0.5)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{
            color: '#9ca3af',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px'
          }}>Volume</div>
          <div style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: '600'
          }}>2.1M</div>
        </div>
        <div style={{
          background: 'rgba(31, 41, 55, 0.5)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{
            color: '#9ca3af',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px'
          }}>Avg Volume</div>
          <div style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: '600'
          }}>1.8M</div>
        </div>
      </div>

      {/* Gráfico principal mejorado */}
      <div style={{ 
        height: compact ? '300px' : '380px', 
        marginBottom: '16px',
        flex: '1',
        minHeight: compact ? '250px' : '320px'
      }}>
        <ResponsiveLine
          data={chartData}
          margin={{ 
            top: 20, 
            right: compact ? 50 : 60, 
            bottom: compact ? 50 : 60, 
            left: compact ? 60 : 70 
          }}
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
            stacked: false,
          }}
          curve="monotoneX"
          axisTop={null}
          axisRight={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
            tickValues: 5,
            format: (value) => `$${value.toFixed(1)}`
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
            tickValues: 5,
            format: (value) => `$${value.toFixed(1)}`
          }}
          axisBottom={null}
          enablePoints={true}
          pointSize={0}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={0}
          pointBorderColor={{ from: 'serieColor' }}
          enablePointLabel={false}
          enableArea={true}
          areaBaselineValue={minPrice * 0.98}
          areaOpacity={0.1}
          enableSlices="x"
          colors={[isPositive ? '#10b981' : '#ef4444']}
          lineWidth={3}
          enableGridX={true}
          enableGridY={true}
          gridXValues={selectedPeriod <= 3 ? 6 : 4}
          gridYValues={5}
          theme={{
            background: 'transparent',
            text: {
              fontSize: 11,
              fill: '#9ca3af',
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axis: {
              domain: {
                line: {
                  stroke: '#374151',
                  strokeWidth: 1
                }
              },
              ticks: {
                line: {
                  stroke: '#374151',
                  strokeWidth: 1
                },
                text: {
                  fontSize: 11,
                  fill: '#9ca3af',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }
              }
            },
            grid: {
              line: {
                stroke: '#374151',
                strokeWidth: 0.5,
                strokeOpacity: 0.5
              }
            },
            crosshair: {
              line: {
                stroke: '#6b7280',
                strokeWidth: 1,
                strokeOpacity: 0.8,
                strokeDasharray: '4 4'
              }
            }
          }}
          useMesh={true}
          animate={true}
          motionConfig="gentle"
          sliceTooltip={({ slice }) => {
            const point = slice.points[0];
            const date = new Date(point.data.xFormatted as string);
            const price = parseFloat(point.data.yFormatted as string);
            
            return (
              <div style={{
                background: '#1f2937',
                border: '1px solid #4b5563',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}>
                <div style={{
                  color: '#d1d5db',
                  fontSize: '14px',
                  marginBottom: '4px'
                }}>
                  {date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isPositive ? '#10b981' : '#ef4444'
                  }}></div>
                  <span style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '18px'
                  }}>
                    ${price.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Footer con información adicional */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#9ca3af',
        paddingTop: '16px',
        borderTop: '1px solid #374151'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          {error && <span style={{ color: '#fbbf24' }}>• Demo Data</span>}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: '#10b981',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }}></div>
          <span>Live</span>
        </div>
      </div>
    </div>
  );
};

export default StockChart;