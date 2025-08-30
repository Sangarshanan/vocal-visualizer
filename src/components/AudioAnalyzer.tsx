import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Play, Square } from 'lucide-react';
import { FrequencyChart } from './FrequencyChart';
import { Spectrogram } from './Spectrogram';
import { VoiceAnalysis } from './VoiceAnalysis';
import { toast } from 'sonner';

interface AudioAnalyzerProps {}

export const AudioAnalyzer: React.FC<AudioAnalyzerProps> = () => {
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [spectrogramData, setSpectrogramData] = useState<number[][]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const realtimeSpectrogramRef = useRef<number[][]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const {
    status,
    startRecording: startMediaRecording,
    stopRecording: stopMediaRecording,
    mediaBlobUrl,
    clearBlobUrl,
  } = useReactMediaRecorder({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: 44100
    },
    onStart: () => {
      setRecordingTime(0);
      realtimeSpectrogramRef.current = [];
      setSpectrogramData([]);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('🎤 Recording started! Drop those vocals!');
    },
    onStop: async (blobUrl, blob) => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Stop all tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      // Process the recorded audio for final spectrogram
      if (blob) {
        await processAudioBlob(blob);
      }
    },
    askPermissionOnMount: true
  });

  const isRecording = status === 'recording';

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Get user media for real-time analysis
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        } 
      });
      
      mediaStreamRef.current = stream;

      // Create audio context for real-time analysis
      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      // Start real-time frequency analysis
      updateFrequencyData();
      
      // Start react-media-recorder recording
      startMediaRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Oops! Mic check failed 🎭 Please check permissions');
    }
  }, [startMediaRecording]);

  const stopRecording = useCallback(() => {
    stopMediaRecording();
  }, [stopMediaRecording]);

  const updateFrequencyData = useCallback(() => {
    if (analyserRef.current && isRecording) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Convert to normalized frequency data
      const normalizedData = Array.from(dataArray).map(value => value / 255);
      setFrequencyData(normalizedData);
      
      // Store for real-time spectrogram display (but don't overwrite final result)
      const spectrogramSlice = normalizedData.slice(0, Math.floor(bufferLength / 4));
      realtimeSpectrogramRef.current.push(spectrogramSlice);
      
      // Keep only last 200 time slices for performance during real-time
      if (realtimeSpectrogramRef.current.length > 200) {
        realtimeSpectrogramRef.current.shift();
      }
      
      // Only update spectrogram with real-time data if we don't have processed data yet
      if (spectrogramData.length === 0) {
        setSpectrogramData([...realtimeSpectrogramRef.current]);
      }
      
      animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
    }
  }, [isRecording, spectrogramData.length]);

  const processAudioBlob = async (blob: Blob) => {
    setIsAnalyzing(true);
    console.log('Starting audio processing...');
    
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 44100 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      console.log('Audio decoded, length:', audioBuffer.length, 'duration:', audioBuffer.duration);
      
      // Get audio data from the first channel
      const channelData = audioBuffer.getChannelData(0);
      setAudioData(channelData);
      
      // Perform FFT analysis on a segment of the audio
      await performFFTAnalysis(channelData, audioContext.sampleRate);
      
      // Generate comprehensive spectrogram from the full audio
      console.log('Generating full spectrogram...');
      const fullSpectrogram = await generateFullSpectrogram(channelData, audioContext.sampleRate);
      console.log('Full spectrogram generated with', fullSpectrogram.length, 'time slices');
      
      // Set the final spectrogram data
      setSpectrogramData(fullSpectrogram);
      
      await audioContext.close();
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Failed to analyze audio');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFullSpectrogram = async (audioData: Float32Array, sampleRate: number): Promise<number[][]> => {
    const windowSize = 1024;
    const hopSize = 256; // Smaller hop size for better time resolution
    const spectrogramResult: number[][] = [];
    
    console.log('Processing audio data of length:', audioData.length);
    
    // Process audio in chunks to avoid blocking
    for (let i = 0; i < audioData.length - windowSize; i += hopSize) {
      const segment = audioData.slice(i, i + windowSize);
      
      // Apply Hamming window
      const windowedSegment = new Float32Array(windowSize);
      for (let j = 0; j < windowSize; j++) {
        const windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * j / (windowSize - 1));
        windowedSegment[j] = segment[j] * windowValue;
      }
      
      // Compute magnitude spectrum using DFT
      const fftSize = 128; // Reduced for better performance
      const frequencies = new Array(fftSize);
      
      for (let f = 0; f < fftSize; f++) {
        let real = 0, imag = 0;
        const freq = f / fftSize;
        
        for (let t = 0; t < windowSize; t++) {
          const angle = -2 * Math.PI * freq * t;
          real += windowedSegment[t] * Math.cos(angle);
          imag += windowedSegment[t] * Math.sin(angle);
        }
        
        // Compute magnitude and normalize
        const magnitude = Math.sqrt(real * real + imag * imag) / windowSize;
        frequencies[f] = Math.min(1, magnitude * 10); // Scale for visibility
      }
      
      spectrogramResult.push(frequencies);
      
      // Yield control occasionally to prevent blocking
      if (i % (hopSize * 50) === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    console.log('Generated spectrogram with dimensions:', spectrogramResult.length, 'x', spectrogramResult[0]?.length);
    return spectrogramResult;
  };

  const performFFTAnalysis = async (audioData: Float32Array, sampleRate: number) => {
    // Take a segment from the middle of the recording for analysis
    const segmentSize = 4096;
    const startIndex = Math.max(0, Math.floor((audioData.length - segmentSize) / 2));
    const segment = audioData.slice(startIndex, startIndex + segmentSize);
    
    // Apply window function (Hamming window)
    const windowedSegment = segment.map((value, index) => {
      const windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * index / (segmentSize - 1));
      return value * windowValue;
    });
    
    // Perform FFT using Web Audio API
    const audioContext = new AudioContext({ sampleRate });
    const buffer = audioContext.createBuffer(1, segmentSize, sampleRate);
    buffer.copyToChannel(windowedSegment, 0);
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = segmentSize;
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    source.start();
    
    // Wait a bit for the analysis
    await new Promise(resolve => setTimeout(resolve, 100));
    analyser.getByteFrequencyData(frequencyData);
    
    const normalizedFrequencyData = Array.from(frequencyData).map(value => value / 255);
    setFrequencyData(normalizedFrequencyData);
    
    await audioContext.close();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border-gray-700/50 shadow-2xl shadow-purple-500/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3 text-xl">
            <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-purple-500 animate-pulse'}`}></div>
            🎙️ Voice Recorder
            {isRecording && <span className="text-red-400 font-normal text-lg animate-pulse">● LIVE</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                className={`transition-all duration-300 transform hover:scale-105 text-lg px-8 py-4 ${
                  isRecording 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-xl shadow-red-500/30 animate-pulse' 
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-xl shadow-purple-500/30'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5 mr-3" />
                    Stop Vibes
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-3" />
                    Start Recording
                  </>
                )}
              </Button>
              
              {mediaBlobUrl && (
                <Button
                  variant="outline"
                  size="lg"
                  className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all duration-300 transform hover:scale-105 px-6 py-4"
                  onClick={() => {
                    const audio = new Audio(mediaBlobUrl);
                    audio.play();
                    toast.success('🔊 Playing back your masterpiece!');
                  }}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Play Back
                </Button>
              )}
            </div>
            
            {isRecording && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-600/50">
                <div className="text-white text-2xl font-mono">
                  ⏱️ {formatTime(recordingTime)}
                </div>
              </div>
            )}
          </div>
          
          {isAnalyzing && (
            <div className="text-center text-gray-300 py-8">
              <div className="relative">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500/20 border-t-purple-500 mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-purple-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-lg font-medium">🔮 Analyzing your voice magic...</p>
              <p className="text-sm text-gray-400 mt-1">Crunching those frequency numbers!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {frequencyData.length > 0 && (
        <FrequencyChart data={frequencyData} isRealTime={isRecording} />
      )}

      {spectrogramData.length > 0 && (
        <Spectrogram spectrogramData={spectrogramData} isRealTime={isRecording} />
      )}

      {frequencyData.length > 0 && !isRecording && (
        <VoiceAnalysis frequencyData={frequencyData} />
      )}
    </div>
  );
};
