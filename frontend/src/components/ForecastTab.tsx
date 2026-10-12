import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { LineChart as ChartIcon, CheckCircle2, TrendingUp, Thermometer, ShieldAlert } from 'lucide-react';

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
      <div className="h-64 flex items-center justify-center text-gray-400 text-xs font-mono">
        Loading 24h LightGBM load forecast...
      </div>
    );
  }

  const timeline = data?.timeline || [];
  const mape = data?.mape || 1.69;
  const predictedPeak = data?.predicted_peak_kw || 0;
  const peakTime = data?.predicted_peak_time || '14:00';

  return (
    <div className="space-y-3">
      {/* Header Metrics */}
      <div className="flex items-center justify-between bg-gray-900/60 p-3 rounded-xl border border-gray-800">
        <div className="flex items-center space-x-3">
          <ChartIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-gray-200">
            Next-24h Campus Load Forecast
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-600/50">
            Model: LightGBM GBDT (MAPE: {mape}%)
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="text-gray-400">Predicted Peak:</span>
            <span className={`font-bold ${predictedPeak > gridCapKw ? 'text-rose-400' : 'text-emerald-300'}`}>
              {predictedPeak} kW @ {peakTime}
            </span>
          </div>
          {predictedPeak > gridCapKw && (
            <span className="flex items-center space-x-1 text-rose-400 text-[10px] font-sans bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Exceeds {gridCapKw}kW grid cap! Triggers Ask</span>
            </span>
          )}
        </div>
      </div>

      {/* 24-Hour Forecast Line Chart */}
      <div className="h-64 bg-[#0c1220] rounded-xl border border-gray-800/80 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} />
            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} domain={[0, 'dataMax + 100']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#374151',
                borderRadius: '0.5rem',
                fontSize: '11px'
              }}
              formatter={(val: any, name: any) => [`${val} kW`, name]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
            <ReferenceLine y={gridCapKw} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Cap: ${gridCapKw}kW`, fill: '#ef4444', fontSize: 10 }} />
            
            <Line type="monotone" dataKey="grid_import_kw" name="Predicted Net Import" stroke="#10b981" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="total_kw" name="Gross Campus Load" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="2 2" />
            <Line type="monotone" dataKey="solar_kw" name="Predicted Solar PV" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
