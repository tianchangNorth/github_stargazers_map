import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export interface CountryData {
  name: string;
  value: number;
  countryCode: string;
}

interface WorldMapProps {
  data: CountryData[];
  loading?: boolean;
}

export default function WorldMap({ data, loading }: WorldMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
    }

    const chart = chartInstance.current;

    // Register world map - using local file to avoid CDN issues
    fetch('/world.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(worldJson => {
        echarts.registerMap('world', worldJson);

        const option: echarts.EChartsOption = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
              if (params.value) {
                return `${params.name}<br/>Stargazers: ${params.value}`;
              }
              return `${params.name}<br/>No data`;
            },
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: '#ec4899',
            borderWidth: 1,
            textStyle: {
              color: '#fff',
            },
          },
          visualMap: {
            min: 0,
            max: Math.max(...data.map(d => d.value), 10),
            text: ['High', 'Low'],
            realtime: false,
            calculable: true,
            inRange: {
              color: [
                'rgba(6, 182, 212, 0.3)', // Cyan low
                'rgba(6, 182, 212, 0.6)',
                'rgba(236, 72, 153, 0.6)', // Pink mid
                'rgba(236, 72, 153, 0.9)', // Pink high
              ],
            },
            textStyle: {
              color: '#fff',
            },
            left: 'left',
            bottom: '20px',
          },
          series: [
            {
              name: 'Stargazers',
              type: 'map',
              map: 'world',
              roam: true,
              emphasis: {
                label: {
                  show: true,
                  color: '#fff',
                },
                itemStyle: {
                  areaColor: '#ec4899',
                  borderColor: '#06b6d4',
                  borderWidth: 2,
                  shadowColor: 'rgba(236, 72, 153, 0.8)',
                  shadowBlur: 20,
                },
              },
              itemStyle: {
                areaColor: 'rgba(30, 41, 59, 0.8)',
                borderColor: 'rgba(100, 116, 139, 0.3)',
                borderWidth: 0.5,
              },
              data: data.map(item => ({
                name: item.name,
                value: item.value,
              })),
            },
          ],
        };

        chart.setOption(option);
      })
      .catch(error => {
        console.error('Failed to load world map:', error);
      });

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={chartRef} className="w-full h-full min-h-[500px]" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
