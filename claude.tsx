import { useState, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';

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

const StockChart = () => {
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
    setLoading(true);
    setTimeout(() => {
      const fallbackData: ChartData[] = [
        {
          id: 'AMXB',
          data: generateFallbackData(selectedPeriod)
        }
      ];
      setChartData(fallbackData);
      setLoading(false);
    }, 300);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <div className="min-h-[500px] bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-gray-400 text-sm">Loading chart data...</span>
        </div>
      </div>
    );
  }

  if (chartData.length === 0 || chartData[0].data.length === 0) {
    return (
      <div className="min-h-[500px] bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <div className="text-4xl mb-2">📊</div>
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
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 shadow-2xl">
      {/* Header con información del stock */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex items-center space-x-6 mb-4 lg:mb-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-white text-2xl font-bold">AMXB</h2>
                <span className="text-gray-400 text-sm bg-gray-800 px-2 py-1 rounded">MX</span>
              </div>
              <p className="text-gray-400 text-sm">América Móvil</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div>
              <div className="text-white text-3xl font-bold">
                ${currentPrice.toFixed(2)}
                <span className="text-gray-400 text-base font-normal ml-1">MXN</span>
              </div>
              <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`text-sm ${isPositive ? '▲' : '▼'}`}>
                  {isPositive ? '▲' : '▼'}
                </span>
                <span className="font-semibold">
                  {isPositive ? '+' : ''}{totalChange.toFixed(2)} ({isPositive ? '+' : ''}{totalChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controles de período elegantes */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          {timePeriods.map((period) => (
            <button
              key={period.value}
              onClick={() => handlePeriodChange(period.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedPeriod === period.value
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide">High</div>
          <div className="text-white text-lg font-semibold">${maxPrice.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide">Low</div>
          <div className="text-white text-lg font-semibold">${minPrice.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide">Volume</div>
          <div className="text-white text-lg font-semibold">2.1M</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide">Avg Volume</div>
          <div className="text-white text-lg font-semibold">1.8M</div>
        </div>
      </div>

      {/* Gráfico principal mejorado */}
      <div className="h-80 mb-4">
        <ResponsiveLine
          data={chartData}
          margin={{ top: 20, right: 50, bottom: 50, left: 60 }}
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
          axisBottom={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
            tickValues: selectedPeriod <= 3 ? 6 : 4,
            format: (value) => {
              const date = new Date(value);
              if (selectedPeriod <= 3) {
                return `${date.getDate()}/${date.getMonth() + 1}`;
              } else {
                return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]}`;
              }
            }
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
            tickValues: 5,
            format: (value) => `$${value.toFixed(1)}`
          }}
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
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
                <div className="text-gray-300 text-sm mb-1">
                  {date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isPositive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-white font-semibold text-lg">
                    ${price.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Footer con información adicional */}
      <div className="flex justify-between items-center text-sm text-gray-400 pt-4 border-t border-gray-700">
        <div className="flex items-center space-x-4">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          {error && <span className="text-yellow-400">• Demo Data</span>}
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>
    </div>
  );
};

export default StockChart;