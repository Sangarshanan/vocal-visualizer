
import React from 'react';
import { AudioAnalyzer } from '@/components/AudioAnalyzer';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-40 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 right-1/3 w-40 h-40 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-6 tracking-tight">
            Voice Visualizer ✨
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-medium leading-relaxed">
            Chronicle thy voice, Let the algorithms render judgment upon thee! 🎤 
            <br />
            <span className="text-purple-300">Real-time FFT + Audio Spectrogram analysis</span>
          </p>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <AudioAnalyzer />
        </div>
        
        <div className="mt-16 text-center">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 max-w-2xl mx-auto">
            <p className="text-gray-400 text-sm leading-relaxed">
              <span className="text-purple-400 font-medium">🔬 Made with Vite, Web Audio API & Vibes ✨ </span>
              <a href="https://github.com/Sangarshanan/vocal-visualizer"><span className="text-cyan-400"> click here for the code 🔗</span></a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
