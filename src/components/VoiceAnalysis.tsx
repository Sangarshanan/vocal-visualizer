
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface VoiceAnalysisProps {
  frequencyData: number[];
}

interface FrequencyBand {
  name: string;
  range: string;
  value: number;
  color: string;
}

interface VoiceCharacteristics {
  fundamentalFrequency: number;
  voiceType: string;
  brightness: number;
  warmth: number;
  clarity: number;
  energy: number;
  dominantBands: FrequencyBand[];
  description: string;
}

export const VoiceAnalysis: React.FC<VoiceAnalysisProps> = ({ frequencyData }) => {
  const analysis = useMemo((): VoiceCharacteristics => {
    // Convert frequency bin data to actual frequencies (assuming 44.1kHz sample rate)
    const sampleRate = 44100;
    const binWidth = sampleRate / 2 / frequencyData.length;
    
    // Define frequency bands for voice analysis
    const bands = {
      subBass: { start: 0, end: 60, name: 'Sub-bass', range: '20-60 Hz', color: 'bg-purple-500' },
      bass: { start: 60, end: 250, name: 'Bass', range: '60-250 Hz', color: 'bg-red-500' },
      lowMid: { start: 250, end: 500, name: 'Low-mid', range: '250-500 Hz', color: 'bg-orange-500' },
      mid: { start: 500, end: 2000, name: 'Midrange', range: '500-2000 Hz', color: 'bg-yellow-500' },
      highMid: { start: 2000, end: 4000, name: 'High-mid', range: '2000-4000 Hz', color: 'bg-green-500' },
      presence: { start: 4000, end: 6000, name: 'Presence', range: '4000-6000 Hz', color: 'bg-blue-500' },
      brilliance: { start: 6000, end: 8000, name: 'Brilliance', range: '6000+ Hz', color: 'bg-indigo-500' }
    };

    // Calculate energy in each band
    const bandEnergies: { [key: string]: number } = {};
    Object.entries(bands).forEach(([key, band]) => {
      const startBin = Math.floor(band.start / binWidth);
      const endBin = Math.floor(band.end / binWidth);
      let energy = 0;
      let count = 0;
      
      for (let i = startBin; i <= endBin && i < frequencyData.length; i++) {
        energy += frequencyData[i];
        count++;
      }
      
      bandEnergies[key] = count > 0 ? energy / count : 0;
    });

    // Find fundamental frequency (peak in the low-mid range)
    let fundamentalFreq = 0;
    let maxMagnitude = 0;
    const fundamentalStart = Math.floor(80 / binWidth);
    const fundamentalEnd = Math.floor(800 / binWidth);
    
    for (let i = fundamentalStart; i <= fundamentalEnd && i < frequencyData.length; i++) {
      if (frequencyData[i] > maxMagnitude) {
        maxMagnitude = frequencyData[i];
        fundamentalFreq = i * binWidth;
      }
    }

    // Determine voice type based on fundamental frequency
    let voiceType = 'Unknown';
    if (fundamentalFreq > 0) {
      if (fundamentalFreq < 165) voiceType = 'Bass/Alto';
      else if (fundamentalFreq < 196) voiceType = 'Baritone/Mezzo-soprano';
      else if (fundamentalFreq < 262) voiceType = 'Tenor/Soprano';
      else voiceType = 'High voice/Falsetto';
    }

    // Calculate voice characteristics
    const brightness = (bandEnergies.presence + bandEnergies.brilliance) / 2;
    const warmth = (bandEnergies.bass + bandEnergies.lowMid) / 2;
    const clarity = bandEnergies.highMid;
    const totalEnergy = Object.values(bandEnergies).reduce((sum, val) => sum + val, 0);

    // Get dominant frequency bands
    const dominantBands = Object.entries(bands)
      .map(([key, band]) => ({
        name: band.name,
        range: band.range,
        value: bandEnergies[key],
        color: band.color
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    // Generate description
    let description = '';
    if (warmth > 0.3) description += 'Warm and rich voice with strong low-frequency presence. ';
    if (brightness > 0.3) description += 'Bright and clear with good high-frequency response. ';
    if (clarity > 0.25) description += 'Excellent vocal clarity and articulation. ';
    if (totalEnergy > 2) description += 'Strong, energetic vocal projection. ';
    if (fundamentalFreq > 0) description += `Fundamental frequency around ${Math.round(fundamentalFreq)}Hz suggests ${voiceType.toLowerCase()} characteristics.`;
    
    if (!description) description = 'Balanced vocal characteristics across frequency spectrum.';

    return {
      fundamentalFrequency: Math.round(fundamentalFreq),
      voiceType,
      brightness: Math.min(brightness * 100, 100),
      warmth: Math.min(warmth * 100, 100),
      clarity: Math.min(clarity * 100, 100),
      energy: Math.min(totalEnergy * 20, 100),
      dominantBands,
      description
    };
  }, [frequencyData]);

  return (
    <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl shadow-pink-500/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3 text-xl">
          <div className="w-4 h-4 rounded-full bg-pink-500 animate-pulse"></div>
          🎭 Voice Personality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Voice Type and Fundamental Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              🎤 Voice Type
            </h3>
            <Badge variant="secondary" className="bg-cyan-600/20 text-purple-200 text-lg px-4 py-2 border border-purple-500/30">
              {analysis.voiceType}
            </Badge>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              🎯 Core Frequency
            </h3>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 backdrop-blur-sm">
              <div className="text-cyan-300 text-2xl font-mono font-bold">
                {analysis.fundamentalFrequency > 0 ? `${analysis.fundamentalFrequency} Hz` : 'Detecting... 🔍'}
              </div>
            </div>
          </div>
        </div>

        {/* Voice Characteristics */}
        <div className="space-y-6">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            ⚡ Voice Stats
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium flex items-center gap-2">
                  ✨ Brightness
                </span>
                <span className="text-white font-bold">{Math.round(analysis.brightness)}%</span>
              </div>
              <Progress value={analysis.brightness} className="h-3 bg-gray-700" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium flex items-center gap-2">
                  🔥 Warmth
                </span>
                <span className="text-white font-bold">{Math.round(analysis.warmth)}%</span>
              </div>
              <Progress value={analysis.warmth} className="h-3 bg-gray-700" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium flex items-center gap-2">
                  🔮 Clarity
                </span>
                <span className="text-white font-bold">{Math.round(analysis.clarity)}%</span>
              </div>
              <Progress value={analysis.clarity} className="h-3 bg-gray-700" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium flex items-center gap-2">
                  ⚡ Energy
                </span>
                <span className="text-white font-bold">{Math.round(analysis.energy)}%</span>
              </div>
              <Progress value={analysis.energy} className="h-3 bg-gray-700" />
            </div>
          </div>
        </div>

        {/* Dominant Frequency Bands */}
        <div className="space-y-4">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            🏆 Top Frequency Zones
          </h3>
          <div className="space-y-3">
            {analysis.dominantBands.map((band, index) => (
              <div key={band.name} className="bg-gray-800/50 border border-gray-600/50 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <div className={`w-4 h-4 rounded-full ${band.color}`}></div>
                    </div>
                    <div>
                      <span className="text-gray-200 font-semibold text-lg">{band.name}</span>
                      <div className="text-sm text-gray-400">{band.range}</div>
                    </div>
                  </div>
                  <div className="text-white font-mono text-xl font-bold">
                    {(band.value * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Description */}
        <div className="space-y-4">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            🎨 Voice Portrait
          </h3>
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
            <p className="text-gray-200 leading-relaxed text-lg">
              {analysis.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
