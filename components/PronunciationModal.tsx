import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Volume2, RotateCcw } from 'lucide-react';
import { evaluatePronunciation, PronunciationResult } from '../services/geminiService';
import { useAppStore } from '../store/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetText: string;
}

export const PronunciationModal: React.FC<Props> = ({ isOpen, onClose, targetText }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const { settings } = useAppStore();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleAnalyze(text);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setResult(null);
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleAnalyze = async (spokenText: string) => {
    setAnalyzing(true);
    try {
      const evalResult = await evaluatePronunciation(targetText, spokenText, settings.pronunciationModel);
      setResult(evalResult);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-xl font-bold mb-4 text-center">Pronunciation Practice</h3>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
          <p className="text-lg font-medium text-gray-800 leading-relaxed">{targetText}</p>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={toggleRecording}
            className={`p-6 rounded-full transition-all duration-300 ${
              isRecording ? 'bg-red-500 animate-pulse shadow-red-200 shadow-lg' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-200 shadow-lg'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
          </button>
        </div>

        {transcript && (
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500 mb-1">You said:</p>
            <p className="text-gray-800 italic">"{transcript}"</p>
          </div>
        )}

        {analyzing && (
          <div className="text-center text-brand-600 animate-pulse">Analyzing pronunciation with {settings.pronunciationModel}...</div>
        )}

        {result && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <span className="font-bold text-gray-700">Score:</span>
              <span className={`text-2xl font-bold ${
                result.score > 80 ? 'text-green-600' : result.score > 50 ? 'text-orange-500' : 'text-red-500'
              }`}>
                {result.score}%
              </span>
            </div>
            <div className="space-y-2">
               <p className="text-sm text-gray-700 font-persian text-right" dir="rtl">{result.feedback}</p>
               <div className="flex flex-wrap gap-2 mt-2 text-sm">
                  {result.correctedWords.map((w, i) => (
                    <span key={i} className={`
                      ${w.status === 'correct' ? 'text-green-600' : 
                        w.status === 'mispronounced' ? 'text-red-500 line-through decoration-2' : 'text-gray-400'}
                    `}>
                      {w.word}
                    </span>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};