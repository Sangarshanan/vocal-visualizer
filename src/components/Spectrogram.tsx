import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpectrogramProps {
  spectrogramData: number[][];
  isRealTime?: boolean;
}

export const Spectrogram: React.FC<SpectrogramProps> = ({ spectrogramData, isRealTime = false }) => {
  const canvasData = useMemo(() => {
    if (!spectrogramData.length || !spectrogramData[0]?.length) {
      console.log('Spectrogram: No data available', { 
        length: spectrogramData.length, 
        firstSliceLength: spectrogramData[0]?.length 
      });
      return null;
    }
    
    console.log('Spectrogram: Processing data', {
      timeSlices: spectrogramData.length,
      frequencyBins: spectrogramData[0].length,
      sampleData: spectrogramData[0].slice(0, 5)
    });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const width = spectrogramData.length;
    const height = spectrogramData[0].length;
    
    canvas.width = width;
    canvas.height = height;
    
    const imageData = ctx.createImageData(width, height);
    
    // Find min and max values for better normalization
    let maxValue = 0;
    let minValue = Infinity;
    const allValues: number[] = [];
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const value = spectrogramData[x][y] || 0;
        if (value > maxValue) maxValue = value;
        if (value < minValue && value > 0) minValue = value;
        if (value > 0) allValues.push(value);
      }
    }
    
    // Calculate percentiles for better dynamic range
    allValues.sort((a, b) => a - b);
    const p95 = allValues[Math.floor(allValues.length * 0.95)] || maxValue;
    const p5 = allValues[Math.floor(allValues.length * 0.05)] || minValue;
    
    console.log('Spectrogram: Value range analysis', {
      minValue,
      maxValue,
      p5,
      p95,
      totalNonZeroValues: allValues.length
    });
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const rawMagnitude = spectrogramData[x][height - 1 - y] || 0; // Flip Y axis
        
        // Improved normalization using percentiles
        let normalizedMagnitude;
        if (rawMagnitude <= 0) {
          normalizedMagnitude = 0;
        } else {
          // Clamp to percentile range and normalize
          const clampedValue = Math.max(p5, Math.min(p95, rawMagnitude));
          normalizedMagnitude = (clampedValue - p5) / (p95 - p5);
        }
        
        // Apply power scaling for better visibility
        const scaledMagnitude = Math.pow(normalizedMagnitude, 0.5);
        
        // Heat map color mapping: Dark blue (low) to bright red (high)
        let r, g, b, alpha;
        
        if (scaledMagnitude < 0.01) {
          // Very low intensity - dark blue/black
          r = 0;
          g = 0;
          b = Math.floor(scaledMagnitude * 2000); // Very subtle blue
          alpha = 255;
        } else if (scaledMagnitude < 0.25) {
          // Low intensity - dark blue to blue
          const t = scaledMagnitude / 0.25;
          r = 0;
          g = 0;
          b = Math.floor(50 + t * 155); // 50 to 205
          alpha = 255;
        } else if (scaledMagnitude < 0.5) {
          // Medium-low intensity - blue to cyan
          const t = (scaledMagnitude - 0.25) / 0.25;
          r = 0;
          g = Math.floor(t * 180); // 0 to 180
          b = Math.floor(205 - t * 50); // 205 to 155
          alpha = 255;
        } else if (scaledMagnitude < 0.75) {
          // Medium-high intensity - cyan to yellow
          const t = (scaledMagnitude - 0.5) / 0.25;
          r = Math.floor(t * 255); // 0 to 255
          g = Math.floor(180 + t * 75); // 180 to 255
          b = Math.floor(155 - t * 155); // 155 to 0
          alpha = 255;
        } else {
          // High intensity - yellow to bright red
          const t = (scaledMagnitude - 0.75) / 0.25;
          r = 255;
          g = Math.floor(255 - t * 255); // 255 to 0
          b = 0;
          alpha = 255;
        }
        
        const index = (y * width + x) * 4;
        imageData.data[index] = r;         // Red
        imageData.data[index + 1] = g;     // Green
        imageData.data[index + 2] = b;     // Blue
        imageData.data[index + 3] = alpha; // Alpha
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL();
    console.log('Spectrogram: Canvas rendered with heat map colors');
    return dataUrl;
  }, [spectrogramData]);

  const FrequencyLabels = () => (
    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
      <span>8kHz</span>
      <span>6kHz</span>
      <span>4kHz</span>
      <span>2kHz</span>
      <span>1kHz</span>
      <span>500Hz</span>
      <span>250Hz</span>
      <span>0Hz</span>
    </div>
  );

  const TimeLabels = () => (
    <div className="absolute bottom-0 left-8 right-0 flex justify-between text-xs text-gray-400 pt-2">
      <span>Start</span>
      <span>Time →</span>
      <span>End</span>
    </div>
  );

  return (
    <Card className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm border-gray-700/40 shadow-2xl shadow-cyan-500/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3 text-xl">
          <div className={`w-4 h-4 rounded-full ${isRealTime ? 'bg-green-500 animate-ping' : 'bg-cyan-500 animate-pulse'}`}></div>
          🔥 Voice Heat Map
          {isRealTime && <span className="text-green-400 ml-3 font-normal animate-pulse">🔴 LIVE HEAT</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="h-80 w-full bg-gray-900/60 rounded-xl border border-gray-700/50 relative overflow-hidden">
            <FrequencyLabels />
            {canvasData ? (
              <div className="absolute left-8 top-0 w-[calc(100%-2rem)] h-full">
                <img 
                  src={canvasData} 
                  alt="Voice Spectrogram Heat Map"
                  className="w-full h-full object-fill rounded-lg"
                  style={{ 
                    imageRendering: 'auto',
                    filter: 'contrast(1.1) brightness(1.1)'
                  }}
                  onLoad={() => console.log('Spectrogram heat map loaded successfully')}
                  onError={(e) => console.error('Spectrogram heat map failed to load:', e)}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <div className="text-4xl mb-2">🔥</div>
                  <div className="text-lg font-medium">
                    {spectrogramData.length > 0 ? 'Processing heat map...' : 'Waiting for audio magic...'}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {spectrogramData.length > 0 
                      ? `Found ${spectrogramData.length} time slices` 
                      : 'Heat map visualization will appear here'
                    }
                  </div>
                </div>
              </div>
            )}
            <TimeLabels />
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-blue-400 font-bold text-lg">❄️ Low Amplitude</div>
              <div className="text-gray-300 text-sm mt-1">Dark blue colors</div>
              <div className="text-xs text-gray-400 mt-1">Quiet frequencies</div>
            </div>
            <div className="text-center bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-yellow-400 font-bold text-lg">🌡️ Medium Amplitude</div>
              <div className="text-gray-300 text-sm mt-1">Cyan to yellow</div>
              <div className="text-xs text-gray-400 mt-1">Moderate energy</div>
            </div>
            <div className="text-center bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-red-400 font-bold text-lg">🔥 High Amplitude</div>
              <div className="text-gray-300 text-sm mt-1">Bright red colors</div>
              <div className="text-xs text-gray-400 mt-1">Strong frequencies</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
