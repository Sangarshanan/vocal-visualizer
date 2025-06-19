
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FrequencyChartProps {
  data: number[];
  isRealTime?: boolean;
}

export const FrequencyChart: React.FC<FrequencyChartProps> = ({ data, isRealTime = false }) => {
  const chartData = useMemo(() => {
    // Convert frequency bin data to chart format
    // Assuming sample rate of 44.1kHz, each bin represents ~21.5Hz
    const binWidth = 44100 / 2 / data.length; // Nyquist frequency divided by number of bins
    
    return data.slice(0, Math.floor(data.length / 4)).map((magnitude, index) => ({
      frequency: Math.round(index * binWidth),
      magnitude: magnitude,
      db: magnitude > 0 ? 20 * Math.log10(magnitude) : -100,
    })).filter(point => point.frequency <= 8000); // Focus on frequencies up to 8kHz for voice analysis
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 shadow-2xl">
          <p className="text-white font-semibold text-lg">{`🎵 ${label} Hz`}</p>
          <p className="text-purple-300 font-medium">
            {`Intensity: ${(payload[0].value * 100).toFixed(1)}%`}
          </p>
          <p className="text-cyan-300 font-medium">
            {`Power: ${payload[0].payload.db.toFixed(1)} dB`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl shadow-cyan-500/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3 text-xl">
          <div className={`w-4 h-4 rounded-full ${isRealTime ? 'bg-green-500 animate-ping' : 'bg-cyan-500 animate-pulse'}`}></div>
          📊 Frequency Spectrum
          {isRealTime && <span className="text-green-400 ml-3 font-normal animate-pulse">🔴 LIVE WAVES</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="frequencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#1e1b4b" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="frequency" 
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => `${value}Hz`}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="magnitude"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#frequencyGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-red-400 font-bold text-lg">🎸 Bass</div>
            <div className="text-gray-300 text-sm mt-1">20-250 Hz</div>
            <div className="text-xs text-gray-400 mt-1">Deep vibes</div>
          </div>
          <div className="text-center bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-yellow-400 font-bold text-lg">🎤 Vocals</div>
            <div className="text-gray-300 text-sm mt-1">250-4000 Hz</div>
            <div className="text-xs text-gray-400 mt-1">Sweet spot</div>
          </div>
          <div className="text-center bg-green-500/10 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-green-400 font-bold text-lg">✨ Sparkle</div>
            <div className="text-gray-300 text-sm mt-1">4000+ Hz</div>
            <div className="text-xs text-gray-400 mt-1">Crispy highs</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
