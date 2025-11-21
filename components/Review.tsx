import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { RefreshCw, Smile, Meh, Frown, Volume2, Square, Book, Tag, Filter, PlayCircle, BookOpen, GraduationCap, Loader2 } from 'lucide-react';
import { generateSpeechFromText } from '../services/geminiService';
import { decodeBase64, decodeAudioData, playAudioBuffer } from '../services/audioUtils';
import { AnalysisType, Flashcard } from '../types';

type StudyMode = 'due' | 'new' | 'all';

export const Review: React.FC = () => {
  const { markCardReviewed, settings, articles, getCardsForSession } = useAppStore();
  
  // Config State
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<AnalysisType | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [studyMode, setStudyMode] = useState<StudyMode>('due');
  const [loading, setLoading] = useState(false);

  // Review State
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Start Session Logic
  const handleStartSession = async () => {
    setLoading(true);
    try {
        const cards = await getCardsForSession(studyMode, {
            articleId: selectedArticleId,
            type: selectedType,
            level: selectedLevel
        }, 20); // Limit session to 20 for focus, or make this configurable
        
        if (cards.length > 0) {
            setSessionCards(cards);
            setCurrentIndex(0);
            setShowBack(false);
            setIsConfiguring(false);
        } else {
            alert("No cards found for this selection.");
        }
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [currentIndex, isConfiguring]);

  const stopAudio = () => {
    try {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (error) {
      // ignore
    }
  };

  const handlePlayAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;
    
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    if (settings.ttsEngine === 'native') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentCard.word);
        utterance.rate = playbackSpeed;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      } else {
         setIsPlaying(false);
      }
      return;
    }

    setLoadingAudio(true);
    try {
      const base64Audio = await generateSpeechFromText(currentCard.word, settings.ttsModel);
      if (base64Audio) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioCtxRef.current;
        const bytes = decodeBase64(base64Audio);
        const buffer = await decodeAudioData(bytes, ctx);
        
        const source = playAudioBuffer(buffer, ctx, () => {
          setIsPlaying(false);
          sourceRef.current = null;
        });
        source.playbackRate.value = playbackSpeed;
        sourceRef.current = source;
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Audio playback failed", error);
      setIsPlaying(false);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleGrade = async (grade: number) => {
    stopAudio();
    setIsPlaying(false);
    
    if (currentCard) {
        await markCardReviewed(currentCard.id, grade);
    }
    
    setShowBack(false);
    if (currentIndex >= sessionCards.length - 1) {
       setSessionCards([]); 
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [0.75, 1.0, 1.25, 0.5];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (sourceRef.current) {
      try {
        sourceRef.current.playbackRate.value = nextSpeed;
      } catch (e) { /* ignore */ }
    }
  };

  const getSourceTitle = (id: string) => {
    const article = articles.find(a => a.id === id);
    return article ? article.title : 'Unknown Source';
  };

  const getTypeColor = (type?: AnalysisType) => {
    switch(type) {
        case 'grammar': return { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' };
        case 'literary': return { bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-800' };
        case 'historical': return { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' };
        default: return { bg: 'bg-brand-50', text: 'text-brand-700', badge: 'bg-brand-100 text-brand-800' };
    }
  };

  const currentCard = sessionCards[currentIndex];
  const typeColors = currentCard ? getTypeColor(currentCard.type) : getTypeColor(undefined);

  if (isConfiguring) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="text-center mb-10">
           <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Plan</h1>
           <p className="text-gray-500">Customize your review session to focus on what matters.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8 space-y-8">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Study Goal</label>
              <div className="grid grid-cols-3 gap-4">
                 <button 
                   onClick={() => setStudyMode('due')}
                   className={`p-4 rounded-xl border-2 text-center transition-all ${studyMode === 'due' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                 >
                   <RefreshCw className="w-6 h-6 mx-auto mb-2" />
                   <div className="font-bold">Review Due</div>
                   <div className="text-xs opacity-75">Spaced Repetition</div>
                 </button>
                 <button 
                   onClick={() => setStudyMode('new')}
                   className={`p-4 rounded-xl border-2 text-center transition-all ${studyMode === 'new' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                 >
                   <GraduationCap className="w-6 h-6 mx-auto mb-2" />
                   <div className="font-bold">Learn New</div>
                   <div className="text-xs opacity-75">Unseen Cards</div>
                 </button>
                 <button 
                   onClick={() => setStudyMode('all')}
                   className={`p-4 rounded-xl border-2 text-center transition-all ${studyMode === 'all' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                 >
                   <BookOpen className="w-6 h-6 mx-auto mb-2" />
                   <div className="font-bold">Cram All</div>
                   <div className="text-xs opacity-75">Review Everything</div>
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                  <select 
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="vocabulary">Vocabulary</option>
                    <option value="grammar">Grammar</option>
                    <option value="literary">Literary Devices</option>
                    <option value="historical">Historical</option>
                  </select>
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select 
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="all">All Levels</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
               </div>

               <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source Text</label>
                  <select 
                    value={selectedArticleId}
                    onChange={(e) => setSelectedArticleId(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="all">All Sources</option>
                    {articles.map(a => (
                      <option key={a.id} value={a.id}>{a.title.length > 50 ? a.title.substring(0,50)+'...' : a.title}</option>
                    ))}
                  </select>
               </div>
            </div>

            <button 
              onClick={handleStartSession}
              disabled={loading}
              className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold text-lg hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all flex items-center justify-center"
            >
               {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><PlayCircle className="w-6 h-6 mr-2" /> Start Session</>}
            </button>

          </div>
        </div>
      </div>
    );
  }

  if (sessionCards.length === 0) {
     return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-green-100 p-6 rounded-full mb-6 inline-block">
          <Smile className="w-16 h-16 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Complete!</h2>
        <p className="text-gray-600 mb-8">You have reviewed the selected cards.</p>
        <button 
          onClick={() => setIsConfiguring(true)}
          className="bg-brand-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-700 shadow-md"
        >
          New Study Session
        </button>
      </div>
     );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
         <button 
           onClick={() => setIsConfiguring(true)}
           className="text-sm text-gray-500 hover:text-gray-900 flex items-center"
         >
            <Filter className="w-4 h-4 mr-1" /> End Session
         </button>
         <div className="text-sm font-medium text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {sessionCards.length}
         </div>
      </div>
      
      <div className="text-center mb-4 text-gray-400 text-xs uppercase tracking-wide font-bold flex justify-center items-center gap-2 flex-wrap">
            <span>{getSourceTitle(currentCard.articleId)}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${typeColors.badge}`}>
                {(currentCard.type || 'vocabulary').toUpperCase()}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">
               {currentCard.level}
            </span>
      </div>
      
      <div 
        className="bg-white min-h-[550px] rounded-2xl shadow-xl border border-gray-200 relative perspective-1000 cursor-pointer transition-all duration-300 flex flex-col"
        onClick={() => !showBack && setShowBack(true)}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          {!showBack ? (
            <>
              <div className="w-full flex justify-end mb-4 absolute top-4 right-4 gap-2">
                <button 
                  onClick={cycleSpeed}
                  className="p-2 rounded-full hover:bg-gray-100 text-xs font-bold text-gray-500 w-10 h-10 flex items-center justify-center border border-gray-200"
                  title="Change Speed"
                >
                  {playbackSpeed}x
                </button>
                <button
                  onClick={handlePlayAudio}
                  disabled={loadingAudio}
                  className={`p-2 rounded-full hover:opacity-80 transition ${typeColors.bg} ${typeColors.text}`}
                >
                  {loadingAudio ? <span className="block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : 
                  isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-4">
                {currentCard.type === 'grammar' ? 'Pattern' : currentCard.type === 'historical' ? 'Reference' : 'Word'}
              </p>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">{currentCard.word}</h2>
              
              {currentCard.phonetic && (
                <p className="text-gray-500 font-mono text-xl mb-8">/{currentCard.phonetic}/</p>
              )}

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 max-w-md w-full max-h-60 overflow-y-auto custom-scrollbar">
                <p className="text-gray-500 italic text-lg leading-relaxed">
                  "{currentCard.context.replace(new RegExp(currentCard.word, 'gi'), '______')}"
                </p>
              </div>
              <p className="absolute bottom-8 text-gray-400 text-sm animate-bounce">Click to show answer</p>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in duration-300 w-full text-left h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h2 className={`text-2xl font-bold ${typeColors.text}`}>{currentCard.word}</h2>
                      {currentCard.partOfSpeech && (
                        <span className="text-sm text-gray-500 font-medium italic">{currentCard.partOfSpeech}</span>
                      )}
                    </div>
                    {currentCard.phonetic && <p className="text-gray-400 text-sm font-mono">/{currentCard.phonetic}/</p>}
                  </div>
                  <button
                    onClick={handlePlayAudio}
                    className={`p-2 rounded-full hover:opacity-80 transition ${typeColors.bg} ${typeColors.text}`}
                  >
                    {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="mb-6 space-y-2">
                    <h3 className={`text-2xl font-bold ${typeColors.text} font-persian text-right`} dir="rtl">{currentCard.persianTranslation}</h3>
                    <p className="text-gray-700 leading-relaxed">{currentCard.definition}</p>
                </div>

                {currentCard.collocations && currentCard.collocations.length > 0 && (
                    <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center">
                        <Tag className="w-3 h-3 mr-1" /> {currentCard.type === 'vocabulary' ? 'Common Phrases' : 'Related Notes'}
                    </h4>
                    <ul className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
                        {currentCard.collocations.map((c, i) => (
                        <li key={i}>• {c}</li>
                        ))}
                    </ul>
                    </div>
                )}
                
                <div className={`p-4 rounded-lg border mb-8 ${typeColors.bg} border-opacity-20`}>
                    <p className={`text-xs font-bold uppercase mb-1 flex items-center ${typeColors.text}`}>
                    <Book className="w-3 h-3 mr-1" /> Example
                    </p>
                    <p className="text-gray-800 italic">"{currentCard.exampleSentence}"</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                <button onClick={(e) => { e.stopPropagation(); handleGrade(1); }} className="flex flex-col items-center p-3 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
                  <Frown className="w-6 h-6 mb-1" />
                  <span className="text-xs font-bold">Difficult</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleGrade(3); }} className="flex flex-col items-center p-3 rounded-lg hover:bg-yellow-50 text-gray-500 hover:text-yellow-600 transition">
                  <Meh className="w-6 h-6 mb-1" />
                  <span className="text-xs font-bold">Okay</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleGrade(5); }} className="flex flex-col items-center p-3 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-600 transition">
                  <Smile className="w-6 h-6 mb-1" />
                  <span className="text-xs font-bold">Easy</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};