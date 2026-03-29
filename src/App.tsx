/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  Settings2, 
  MessageSquare, 
  User, 
  Users, 
  Volume2, 
  Loader2,
  RefreshCw,
  Type
} from 'lucide-react';
import { generateFlemishAudio, TTSOptions } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<TTSOptions>({
    format: 'monologue',
    voice: 'female',
    speed: 'normal',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    setAudioUrl(null);
    setTranscript(null);
    
    try {
      const result = await generateFlemishAudio(text, options);
      if (result.audioData) {
        const binary = atob(result.audioData);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/pcm' }); // Note: Gemini TTS returns raw PCM 24kHz usually, but sometimes it's wrapped. 
        // Actually, for browser playback, we might need to wrap it or use AudioContext.
        // Let's try a standard Blob first, but typically PCM needs a header.
        // Wait, the docs say: "decode and play audio with sample rate 24000".
        // I'll use a helper to create a WAV header for the PCM data.
        
        const wavBlob = createWavBlob(bytes, 24000);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
        setTranscript(result.transcript);
      }
    } catch (error) {
      console.error("Error generating audio:", error);
      alert("Er is een fout opgetreden bij het genereren van de audio.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createWavBlob = (pcmData: Uint8Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + pcmData.length, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    // write the PCM samples
    for (let i = 0; i < pcmData.length; i++) {
      view.setUint8(44 + i, pcmData[i]);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `vlaams-babbeltje-${Date.now()}.wav`;
      a.click();
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const updateProgress = () => setCurrentTime(audio.currentTime);
      const setAudioDuration = () => setDuration(audio.duration);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('loadedmetadata', setAudioDuration);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', updateProgress);
        audio.removeEventListener('loadedmetadata', setAudioDuration);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioUrl]);

  // Simple highlighting logic: split transcript into words and highlight based on progress
  const words = transcript ? transcript.split(/\s+/) : [];
  const highlightedIndex = Math.floor((currentTime / duration) * words.length);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#2D2A26] font-sans selection:bg-[#E6D5B8]">
      {/* Header */}
      <header className="border-b border-[#E6D5B8] bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
              <Volume2 size={22} />
            </div>
            <h1 className="text-2xl font-serif italic font-semibold tracking-tight">Vlaams Babbeltje</h1>
          </div>
          <div className="text-xs uppercase tracking-widest font-semibold text-[#5A5A40]/60">
            Flemish Language Tool
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Input Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-[#5A5A40]">
            <Type size={18} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Voer je tekst in</h2>
          </div>
          
          <div className="relative group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Typ of plak hier je tekst..."
              className="w-full h-48 p-6 bg-white border border-[#E6D5B8] rounded-3xl shadow-sm focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] outline-none transition-all resize-none text-lg leading-relaxed"
            />
            <div className="absolute bottom-4 right-6 text-xs text-[#5A5A40]/40 font-mono">
              {text.length} tekens
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Format */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5A5A40]/60 flex items-center gap-2">
                <MessageSquare size={14} /> Spraakformaat
              </label>
              <div className="flex bg-[#E6D5B8]/30 p-1 rounded-2xl border border-[#E6D5B8]">
                <button
                  onClick={() => setOptions({ ...options, format: 'monologue' })}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    options.format === 'monologue' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/60 hover:text-[#5A5A40]'
                  }`}
                >
                  <User size={14} /> Monoloog
                </button>
                <button
                  onClick={() => setOptions({ ...options, format: 'dialogue' })}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    options.format === 'dialogue' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/60 hover:text-[#5A5A40]'
                  }`}
                >
                  <Users size={14} /> Dialoog
                </button>
              </div>
            </div>

            {/* Voice (only for monologue) */}
            <div className={`space-y-3 transition-opacity duration-300 ${options.format === 'dialogue' ? 'opacity-40 pointer-events-none' : ''}`}>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5A5A40]/60 flex items-center gap-2">
                <Settings2 size={14} /> Stemselectie
              </label>
              <div className="flex bg-[#E6D5B8]/30 p-1 rounded-2xl border border-[#E6D5B8]">
                <button
                  onClick={() => setOptions({ ...options, voice: 'female' })}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    options.voice === 'female' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/60 hover:text-[#5A5A40]'
                  }`}
                >
                  Vrouw
                </button>
                <button
                  onClick={() => setOptions({ ...options, voice: 'male' })}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    options.voice === 'male' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/60 hover:text-[#5A5A40]'
                  }`}
                >
                  Man
                </button>
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5A5A40]/60 flex items-center gap-2">
                <RefreshCw size={14} /> Spraaksnelheid
              </label>
              <div className="flex bg-[#E6D5B8]/30 p-1 rounded-2xl border border-[#E6D5B8]">
                <button
                  onClick={() => setOptions({ ...options, speed: 'normal' })}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    options.speed === 'normal' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/60 hover:text-[#5A5A40]'
                  }`}
                >
                  Normaal
                </button>
                <button
                  onClick={() => setOptions({ ...options, speed: 'slow' })}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    options.speed === 'slow' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/60 hover:text-[#5A5A40]'
                  }`}
                >
                  Traag
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="w-full py-5 bg-[#5A5A40] text-white rounded-3xl font-semibold text-lg hover:bg-[#4A4A30] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-[#5A5A40]/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" />
                Audio genereren...
              </>
            ) : (
              <>
                <Volume2 size={20} />
                Genereer Vlaamse Audio
              </>
            )}
          </button>
        </section>

        {/* Output Section */}
        <AnimatePresence>
          {audioUrl && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-8 pt-8 border-t border-[#E6D5B8]"
            >
              {/* Audio Player */}
              <div className="bg-white border border-[#E6D5B8] rounded-[2rem] p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-6">
                  <button
                    onClick={togglePlay}
                    className="w-16 h-16 bg-[#5A5A40] text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                  </button>
                  
                  <div className="flex-1 space-y-2">
                    <div className="h-2 bg-[#E6D5B8]/30 rounded-full overflow-hidden relative">
                      <div 
                        className="absolute top-0 left-0 h-full bg-[#5A5A40] transition-all duration-100"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-[#5A5A40]/60">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="p-4 text-[#5A5A40] hover:bg-[#E6D5B8]/30 rounded-full transition-all"
                    title="Download audio"
                  >
                    <Download size={24} />
                  </button>
                </div>
                
                <audio ref={audioRef} src={audioUrl} className="hidden" />
              </div>

              {/* Transcript Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A40]/60">Transcriptie</h3>
                </div>
                <div className="bg-white border border-[#E6D5B8] rounded-[2rem] p-8 min-h-[200px] leading-relaxed text-xl font-serif">
                  {words.map((word, i) => (
                    <span
                      key={i}
                      className={`inline-block mr-1.5 transition-colors duration-200 ${
                        i === highlightedIndex ? 'bg-[#E6D5B8] text-[#5A5A40] rounded-md px-1 -mx-1' : 'text-[#2D2A26]'
                      }`}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 text-center text-[#5A5A40]/40 text-sm border-t border-[#E6D5B8]/50">
        <p>© 2026 Vlaams Babbeltje — Gemaakt voor taalleerders.</p>
      </footer>
    </div>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
