import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { LineChart as ChartIcon, ShieldAlert } from 'lucide-react';
import { NeoBadge } from './ui/NeoBadge';

interface ForecastTabProps {
  gridCapKw: number;
}

export const ForecastTab: React.FC<ForecastTabProps> = ({ gridCapKw }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/forecast')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center font-mono font-bold text-xs bg-white border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000]">
        LOADING 24H LIGHTGBM FORECAST...
      </div>
    );
  }

  const timeline = data?.timeline || [];
  const mape = data?.mape || 1.69;
  const predictedPeak = data?.predicted_peak_kw || 0;
  const peakTime = data?.predicted_peak_time || '14:00';

  return (
    <div className="space-y-3 font-['Space_Grotesk',sans-serif]">
      {/* Header Metrics */}
      <div className="flex flex-wrap items-center justify-between bg-[#FFF4E0] p-3 border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000] gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-[#FFD60A] border-2 border-black rounded-[3px] flex items-center justify-center">
            <ChartIcon className="w-4 h-4 text-black" />
          </div>
          <span className="text-xs font-extrabold uppercase tracking-tight">
            24-HOUR CAMPUS LOAD FORECAST
          </span>
          <NeoBadge variant="mint">
            LightGBM GBDT (MAPE: {mape}%)
          </NeoBadge>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono font-bold">
          <div className="bg-white border-2 border-black px-2.5 py-1 rounded-[3px] shadow-[2px_2px_0_#000]">
            <span className="text-neutral-600 mr-1.5 font-normal">PREDICTED PEAK:</span>
            <span className={predictedPeak > gridCapKw ? 'text-[#FF3B30] font-extrabold' : 'text-[#06D6A0] font-extrabold'}>
              {predictedPeak} kW @ {peakTime}
            </span>
          </div>

          {predictedPeak > gridCapKw && (
            <div className="flex items-center space-x-1 bg-[#FF3B30] text-white px-2 py-1 border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000]">
              <ShieldAlert className="w-3.5 h-3.5 text-white" />
              <span>EXCEEDS {gridCapKw}kW CAP!</span>
            </div>
          )}
        </div>
      </div>

      {/* 24-Hour Forecast Line Chart */}
      <div className="h-64 bg-white border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#000000" strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis dataKey="time" stroke="#000000" strokeWidth={2} fontSize={10} fontFamily="Space Mono" tickLine={true} />
            <YAxis stroke="#000000" strokeWidth={2} fontSize={10} fontFamily="Space Mono" tickLine={true} domain={[0, 'dataMax + 100']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFD60A',
                borderColor: '#000000',
                borderWidth: '2px',
                borderRadius: '3px',
                boxShadow: '4px 4px 0 #000',
                fontSize: '11px',
                fontFamily: 'Space Mono',
                fontWeight: 'bold',
                color: '#000000'
              }}
              formatter={(val: any, name: any) => [`${val} kW`, name]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Space Grotesk', fontWeight: 'bold', paddingTop: '4px' }} />
            <ReferenceLine
              y={gridCapKw}
              stroke="#FF3B30"
              strokeWidth={3}
              strokeDasharray="6 4"
              label={{
                value: `CAP ${gridCapKw}kW`,
                fill: '#FF3B30',
                fontSize: 10,
                fontFamily: 'Space Mono',
                fontWeight: 'bold',
                position: 'insideTopRight'
              }}
            />
            
            <Line
              type="monotone"
              dataKey="grid_import_kw"
              name="Net Grid Import"
              stroke="#06D6A0"
              strokeWidth={4}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="total_kw"
              name="Gross Campus Load"
              stroke="#3A86FF"
              strokeWidth={2.5}
              dot={false}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="solar_kw"
              name="Predicted Solar PV"
              stroke="#FFD60A"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
