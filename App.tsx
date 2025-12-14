import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Languages, 
  Mic, 
  Wand2,
  Volume2
} from 'lucide-react';
import { SeekBar } from './components/SeekBar';
import { SubtitleDisplay } from './components/SubtitleDisplay';
import { processContent, alignSegments, base64ToWavBlob } from './services/geminiService';
import { Language, VOICES, SubtitleSegment, VoiceOption } from './types';

function App() {
  // State
  const [inputText, setInputText] = useState("");
  const [selectedLang, setSelectedLang] = useState<Language>(Language.ENGLISH);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Player State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  
  // Player Settings
  const [seekStep, setSeekStep] = useState(5);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio Element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Sync settings with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
    }
  }, [playbackRate, volume]);

  // Update timestamps when metadata is loaded
  useEffect(() => {
    if (duration > 0 && segments.length > 0) {
      // If we haven't aligned them based on real duration yet
      if (segments[segments.length - 1].endTime === 0) {
        setSegments(prev => alignSegments(prev, duration));
      }
    }
  }, [duration, segments]);

  // Scroll active subtitle into view
  useEffect(() => {
    const activeIndex = segments.findIndex(
      seg => currentTime >= seg.startTime && currentTime < seg.endTime
    );
    if (activeIndex !== -1) {
      const element = document.getElementById(`subtitle-${activeIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, segments]);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    setAudioUrl(null);
    setSegments([]);
    setCurrentTime(0);
    setDuration(0);
    
    // Cleanup previous audio source
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    
    try {
      const result = await processContent(inputText, selectedLang, selectedVoice.name);
      
      // Convert raw PCM base64 to WAV Blob
      const blob = base64ToWavBlob(result.audioBase64);
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url);
      setSegments(result.segments);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        // Re-apply settings after load
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.volume = volume;
      }

    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate content. Please check your API Key and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (amount: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(Math.max(audioRef.current.currentTime + amount, 0), duration);
    }
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-500 p-2 rounded-lg text-white">
              <Languages size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600">
              LinguaVoice AI
            </h1>
          </div>
          <div className="text-sm text-gray-500">
            Powered by Gemini 2.5
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input & Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700">Source Text</label>
              <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-medium">
                <button
                  onClick={() => setSelectedLang(Language.ENGLISH)}
                  className={`px-3 py-1 rounded-md transition-colors ${selectedLang === Language.ENGLISH ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setSelectedLang(Language.VIETNAMESE)}
                  className={`px-3 py-1 rounded-md transition-colors ${selectedLang === Language.VIETNAMESE ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Vietnamese
                </button>
              </div>
            </div>
            
            <textarea
              className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none transition-all text-gray-700 leading-relaxed"
              placeholder={`Enter ${selectedLang} text here to convert to speech...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">AI Voice Model</label>
                <div className="relative">
                  <select
                    value={selectedVoice.id}
                    onChange={(e) => {
                      const voice = VOICES.find(v => v.id === e.target.value);
                      if (voice) setSelectedVoice(voice);
                    }}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    {VOICES.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.gender})
                      </option>
                    ))}
                  </select>
                  <Mic className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputText}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-white shadow-lg shadow-brand-500/30 transition-all ${
                    isGenerating || !inputText 
                      ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 transform active:scale-95'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} />
                      <span>Generate Audio</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Audio Player Card */}
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity duration-500 ${audioUrl ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
             
             {/* SeekBar */}
             <div className="mb-4">
                <SeekBar 
                  currentTime={currentTime} 
                  duration={duration} 
                  onSeek={handleSeek}
                  onSeekStart={() => { if(isPlaying) audioRef.current?.pause(); }}
                  onSeekEnd={() => { if(isPlaying) audioRef.current?.play(); }}
                />
             </div>

             {/* Controls Row */}
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               
               {/* Left Group: Playback Controls */}
               <div className="flex items-center gap-3 order-1 md:order-1">
                 <button 
                   onClick={togglePlay}
                   className="w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-600/30 hover:bg-brand-700 active:scale-95 transition-all"
                   title={isPlaying ? "Pause" : "Play"}
                 >
                   {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                 </button>
                 
                 <button 
                  onClick={() => skip(-seekStep)} 
                  className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all" 
                  title={`Rewind ${seekStep} seconds`}
                >
                   <RotateCcw size={20} />
                 </button>

                 <button 
                  onClick={() => skip(seekStep)} 
                  className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all" 
                  title={`Forward ${seekStep} seconds`}
                >
                   <RotateCw size={20} />
                 </button>
               </div>

               {/* Center Group: Time Display */}
               <div className="text-sm font-medium text-gray-500 font-mono order-3 md:order-2 w-full md:w-auto text-center">
                 {formatTime(currentTime)} / {formatTime(duration)}
               </div>

               {/* Right Group: Settings */}
               <div className="flex items-center gap-3 order-2 md:order-3">
                  {/* Seek Step Dropdown */}
                  <select 
                    value={seekStep}
                    onChange={(e) => setSeekStep(Number(e.target.value))}
                    className="bg-gray-50 border border-gray-200 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-600 cursor-pointer hover:bg-white"
                    title="Seek Step"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                  </select>

                  {/* Playback Speed Dropdown */}
                  <select 
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(Number(e.target.value))}
                    className="bg-gray-50 border border-gray-200 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-600 cursor-pointer hover:bg-white"
                    title="Playback Speed"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1.0}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2.0}>2.0x</option>
                  </select>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1 group" title={`Volume: ${Math.round(volume * 100)}%`}>
                    <Volume2 size={16} className="text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-16 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>
               </div>
             </div>
             
             <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
               <a 
                 href={audioUrl || '#'} 
                 download="linguavoice-audio.wav"
                 className={`flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors ${!audioUrl ? 'pointer-events-none' : ''}`}
               >
                 <Download size={16} />
                 <span>Download Audio (WAV)</span>
               </a>
             </div>
          </div>
        </div>

        {/* Right Column: Subtitles */}
        <div className="h-full">
          <SubtitleDisplay segments={segments} currentTime={currentTime} />
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">How it works</h4>
            <ul className="text-xs text-blue-700 space-y-2 list-disc pl-4">
              <li>Enter your text (English or Vietnamese).</li>
              <li>Gemini AI translates and segments the text.</li>
              <li>High-fidelity audio is synthesized using Gemini TTS.</li>
              <li>Subtitles are automatically aligned to the audio.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;