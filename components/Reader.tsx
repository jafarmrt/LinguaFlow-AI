import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { generateSpeechFromText, translateFullText, analyzeTextForVocabulary, analyzeSingleWord } from '../services/geminiService';
import { decodeBase64, decodeAudioData, playAudioBuffer } from '../services/audioUtils';
import { Play, Pause, Languages, Mic, Volume2, X, SkipBack, SkipForward, Tag, ChevronRight, Loader2, BookOpen, AlertCircle, ChevronDown } from 'lucide-react';
import { PronunciationModal } from './PronunciationModal';
import { Flashcard, AnalysisType, ArticleSegment } from '../types';

export const Reader: React.FC = () => {
  const { id, segmentIndex } = useParams<{ id: string; segmentIndex?: string }>();
  const currentIdx = segmentIndex ? parseInt(segmentIndex) : 0;
  
  const navigate = useNavigate();
  const { 
    getArticleMetadata, 
    getSegment,
    updateSegmentTranslation, 
    searchFlashcards,
    updateSegmentAnalysis,
    addCustomWordToSegment,
    settings 
  } = useAppStore();
  
  const articleMetadata = getArticleMetadata(id || '');
  const [segment, setSegment] = useState<ArticleSegment | null>(null);
  const [nextSegmentMeta, setNextSegmentMeta] = useState<ArticleSegment | null>(null); // Metadata only from article list
  const [segmentLoading, setSegmentLoading] = useState(true);

  // Async load segment content
  useEffect(() => {
    if (id) {
      setSegmentLoading(true);
      getSegment(id, currentIdx).then(seg => {
        setSegment(seg || null);
        setSegmentLoading(false);
      });
      
      // Check next segment metadata from the article list
      if (articleMetadata) {
          const next = articleMetadata.segments.find(s => s.index === currentIdx + 1);
          setNextSegmentMeta(next || null);
      }
    }
  }, [id, currentIdx, articleMetadata]);

  // State for Content
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [analyzingNext, setAnalyzingNext] = useState(false);
  const [activeCard, setActiveCard] = useState<Flashcard | null>(null);
  const [pronunciationText, setPronunciationText] = useState<string | null>(null);

  // State for On-the-fly Analysis
  const [selectedWordForAnalysis, setSelectedWordForAnalysis] = useState<{word: string, context: string} | null>(null);
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);

  // State for Audio Player
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [segmentFlashcards, setSegmentFlashcards] = useState<Flashcard[]>([]);

  // Refs for Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCache = useRef<Map<number, AudioBuffer>>(new Map()); 
  const isMountedRef = useRef(true);
  const isPlayingRef = useRef(false); 

  // Fetch Flashcards for this specific segment/article on load
  useEffect(() => {
      if(id) {
        searchFlashcards({ articleId: id }).then(cards => setSegmentFlashcards(cards));
      }
  }, [id]);

  // Reset state when segment changes
  useEffect(() => {
    setCurrentSentenceIndex(-1);
    setIsPlaying(false);
    isPlayingRef.current = false;
    setShowTranslation(false);
    setAudioError(null);
    stopAllAudio();
    audioCache.current.clear();
  }, [currentIdx]);

  // Helpers
  const wordMap = useMemo(() => {
    const map = new Map<string, Flashcard>();
    segmentFlashcards.forEach(card => {
        map.set(card.lemma.toLowerCase(), card);
        map.set(card.word.toLowerCase(), card);
    });
    return map;
  }, [segmentFlashcards]);

  const getFlashcardForWord = (word: string) => {
    const normalized = word.replace(/[.,!?;:"()]/g, '').toLowerCase();
    return wordMap.get(normalized);
  };

  // Sentence Splitting Logic
  const sentences = useMemo(() => {
    if (!segment) return [];
    const rawSentences = segment.content.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [];
    return rawSentences.map(s => s.trim()).filter(s => s.length > 0);
  }, [segment]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { 
      isMountedRef.current = false; 
      stopAllAudio(); 
    };
  }, []);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const stopAllAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) { /* ignore */ }
      sourceRef.current = null;
    }
    window.speechSynthesis.cancel();
  };

  const preloadSentence = async (index: number) => {
    if (settings.ttsEngine !== 'gemini') return;
    if (index < 0 || index >= sentences.length) return;
    if (audioCache.current.has(index)) return;

    try {
      const text = sentences[index];
      const base64 = await generateSpeechFromText(text, settings.ttsModel);
      if (base64 && isMountedRef.current) {
        const ctx = getAudioContext();
        const bytes = decodeBase64(base64);
        const buffer = await decodeAudioData(bytes, ctx);
        audioCache.current.set(index, buffer);
      }
    } catch (e) {
      console.warn(`Preload failed for index ${index}`, e);
    }
  };

  const playSentence = async (index: number) => {
    if (index < 0 || index >= sentences.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentSentenceIndex(-1);
      return;
    }

    setCurrentSentenceIndex(index);
    setAudioError(null);
    stopAllAudio();

    const textToRead = sentences[index];

    if (settings.ttsEngine === 'native') {
      setIsLoadingAudio(false);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'en-US';
      utterance.rate = playbackRate;
      utterance.onend = () => {
        if (isMountedRef.current && isPlayingRef.current) {
          playSentence(index + 1);
        }
      };
      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        setAudioError(`Native TTS Error: ${e.error}`);
        setIsPlaying(false);
        isPlayingRef.current = false;
      };
      window.speechSynthesis.speak(utterance);
      return;
    }

    setIsLoadingAudio(true);
    
    try {
      let buffer = audioCache.current.get(index);
      if (!buffer) {
        const base64Audio = await generateSpeechFromText(textToRead, settings.ttsModel);
        if (!isMountedRef.current || !isPlayingRef.current) {
            setIsLoadingAudio(false);
            return;
        }
        if (base64Audio) {
           const ctx = getAudioContext();
           if (ctx.state === 'suspended') await ctx.resume();
           const bytes = decodeBase64(base64Audio);
           buffer = await decodeAudioData(bytes, ctx);
           audioCache.current.set(index, buffer);
        } else {
           throw new Error("No audio generated");
        }
      }

      if (!buffer || !isMountedRef.current || !isPlayingRef.current) {
          setIsLoadingAudio(false);
          return;
      }

      setIsLoadingAudio(false);
      
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const source = playAudioBuffer(buffer, ctx, () => {
        if (isMountedRef.current && isPlayingRef.current) {
          playSentence(index + 1);
        }
      });
      
      source.playbackRate.value = playbackRate;
      sourceRef.current = source;
      preloadSentence(index + 1);

    } catch (e) {
      console.error("TTS Playback Error:", e);
      setAudioError("Playback error.");
      setIsLoadingAudio(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      stopAllAudio();
    } else {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      setIsPlaying(true);
      isPlayingRef.current = true;
      let nextIndex = currentSentenceIndex;
      if (nextIndex === -1 || nextIndex >= sentences.length) nextIndex = 0;
      playSentence(nextIndex);
    }
  };

  const changeSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newRate = speeds[nextIndex];
    setPlaybackRate(newRate);
    
    if (settings.ttsEngine === 'native') {
       if (window.speechSynthesis.speaking && isPlayingRef.current) {
          window.speechSynthesis.cancel();
          playSentence(currentSentenceIndex);
       }
    } else {
      if (sourceRef.current) {
        sourceRef.current.playbackRate.value = newRate;
      }
    }
  };

  const skipSentence = (direction: 'prev' | 'next') => {
    let nextIndex = direction === 'next' ? currentSentenceIndex + 1 : currentSentenceIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= sentences.length) nextIndex = sentences.length - 1;
    if (isPlaying) playSentence(nextIndex);
    else setCurrentSentenceIndex(nextIndex);
  };

  const handleTranslate = async () => {
    if (!segment || !articleMetadata) return;
    if (segment.persianTranslation) {
      setShowTranslation(!showTranslation);
      return;
    }

    setTranslating(true);
    try {
      const trans = await translateFullText(segment.content, settings.translationModel);
      await updateSegmentTranslation(articleMetadata.id, currentIdx, trans);
      // Update local state to show immediately
      setSegment(prev => prev ? ({ ...prev, persianTranslation: trans }) : null);
      setShowTranslation(true);
    } finally {
      setTranslating(false);
    }
  };

  const handleJumpToPart = (e: React.ChangeEvent<HTMLSelectElement>) => {
     if (!articleMetadata) return;
     const idx = parseInt(e.target.value);
     const targetSegmentMeta = articleMetadata.segments.find(s => s.index === idx);
     
     if (targetSegmentMeta) {
        if (targetSegmentMeta.isAnalyzed) {
            navigate(`/read/${articleMetadata.id}/${idx}`);
        } else {
            // Check if content is actually analyzed in DB, metadata might be stale? 
            // We'll just navigate to select-words, which handles analysis if missing.
            // Or fetch content to check.
            // For now, follow old flow.
            // We need content to analyze.
            setAnalyzingNext(true);
            getSegment(articleMetadata.id, idx).then(seg => {
                 if(seg) {
                    analyzeTextForVocabulary(seg.content, 'B2', settings.analysisModel, settings.enabledTypes)
                    .then(analysis => {
                        updateSegmentAnalysis(articleMetadata.id, idx, analysis);
                        navigate(`/select-words/${articleMetadata.id}/${idx}`);
                    })
                    .catch(err => alert("Failed to analyze part. " + err.message))
                    .finally(() => setAnalyzingNext(false));
                 }
            });
        }
     }
  };

  const handleNextPart = async () => {
    if (!nextSegmentMeta || !articleMetadata) return;

    if (nextSegmentMeta.isAnalyzed) {
      navigate(`/read/${articleMetadata.id}/${nextSegmentMeta.index}`);
    } else {
      setAnalyzingNext(true);
      try {
        const nextContentSeg = await getSegment(articleMetadata.id, nextSegmentMeta.index);
        if(nextContentSeg) {
            const analysis = await analyzeTextForVocabulary(nextContentSeg.content, 'B2', settings.analysisModel, settings.enabledTypes);
            await updateSegmentAnalysis(articleMetadata.id, nextSegmentMeta.index, analysis);
            navigate(`/select-words/${articleMetadata.id}/${nextSegmentMeta.index}`);
        }
      } catch (e) {
        console.error("Failed to analyze next part", e);
        alert("Failed to analyze the next part. Please check settings or connectivity.");
      } finally {
        setAnalyzingNext(false);
      }
    }
  };

  const handleWordClick = (word: string, context: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanWord = word.replace(/[.,!?;:"()]/g, '');
    const existingCard = getFlashcardForWord(cleanWord);
    if (existingCard) {
      setActiveCard(existingCard);
    } else if (cleanWord.trim().length > 1) {
       setSelectedWordForAnalysis({ word: cleanWord, context });
    }
  };

  const confirmSingleAnalysis = async () => {
    if (!selectedWordForAnalysis || !articleMetadata) return;
    setIsAnalyzingSingle(true);
    try {
      const analysis = await analyzeSingleWord(selectedWordForAnalysis.word, selectedWordForAnalysis.context, settings.analysisModel);
      await addCustomWordToSegment(articleMetadata.id, currentIdx, analysis);
      
      // Refresh flashcards for this segment
      const updatedCards = await searchFlashcards({ articleId: articleMetadata.id });
      setSegmentFlashcards(updatedCards);

      setSelectedWordForAnalysis(null);
      // Open card
      const newCard = updatedCards.find(c => c.word.toLowerCase() === selectedWordForAnalysis.word.toLowerCase());
      if(newCard) setActiveCard(newCard);

    } catch (error) {
      console.error("Single word analysis failed", error);
      alert("Could not analyze word. Please try again.");
    } finally {
      setIsAnalyzingSingle(false);
    }
  };

  const getTypeStyles = (type: AnalysisType) => {
    switch(type) {
      case 'grammar': return 'text-purple-700 border-purple-300 bg-purple-50 hover:bg-purple-100';
      case 'literary': return 'text-pink-700 border-pink-300 bg-pink-50 hover:bg-pink-100';
      case 'historical': return 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100';
      default: return 'text-brand-700 border-brand-300 bg-brand-50 hover:bg-brand-100';
    }
  };

  if (segmentLoading) return <div className="p-20 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4"/>Loading content...</div>;
  if (!articleMetadata || !segment) return <div className="p-8 text-center">Segment not found</div>;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Top Controls */}
      <div className="bg-white sticky top-20 z-40 shadow-md border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col w-full md:w-auto">
            <h1 className="font-bold text-lg text-gray-800 truncate max-w-md">{articleMetadata.title}</h1>
            <div className="mt-1 relative inline-block w-48">
              <select 
                value={currentIdx}
                onChange={handleJumpToPart}
                className="appearance-none w-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold py-1 pl-3 pr-8 rounded-full cursor-pointer hover:bg-brand-100 outline-none focus:ring-2 focus:ring-brand-500"
              >
                {articleMetadata.segments.map(s => (
                   <option key={s.index} value={s.index}>
                     Part {s.index + 1} {s.isAnalyzed ? '' : '(Not Analyzed)'}
                   </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-brand-600 absolute right-3 top-1.5 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button onClick={() => skipSentence('prev')} className="p-2 text-gray-600 hover:text-brand-600 hover:bg-white rounded-md transition">
                 <SkipBack className="w-5 h-5" />
              </button>
              <button 
                onClick={togglePlay}
                className={`p-2 mx-1 rounded-md transition flex items-center gap-2 ${isPlaying ? 'bg-red-50 text-red-600' : 'bg-brand-600 text-white shadow-sm'}`}
              >
                {isLoadingAudio ? <span className="block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : 
                 isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={() => skipSentence('next')} className="p-2 text-gray-600 hover:text-brand-600 hover:bg-white rounded-md transition">
                 <SkipForward className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2"></div>
              <button onClick={changeSpeed} className="px-2 py-1 text-xs font-bold text-gray-600 hover:bg-white rounded border border-transparent hover:border-gray-200 transition min-w-[3rem]">
                {playbackRate}x
              </button>
            </div>
            {settings.ttsEngine === 'native' ? (
               <span className="text-[10px] text-gray-400 mt-1">Native TTS</span>
            ) : (
               audioError && <span className="text-xs text-red-500 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> {audioError}</span>
            )}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setPronunciationText(segment.content.substring(0, 200))}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Pronunciation Practice"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={handleTranslate}
              disabled={translating}
              className={`flex items-center px-3 py-2 rounded-lg transition ${showTranslation ? 'bg-brand-100 text-brand-700 border border-brand-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Languages className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">{translating ? '...' : 'Fa'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        <div className="lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-lg text-gray-800 text-justify leading-relaxed">
          {sentences.map((sentence, sIdx) => {
            const isCurrent = sIdx === currentSentenceIndex;
            const parts = sentence.split(/(\s+)/);
            
            return (
              <span 
                key={sIdx} 
                className={`inline transition-colors duration-300 rounded px-1 box-decoration-clone ${isCurrent ? 'bg-brand-100 text-brand-900' : ''}`}
              >
                {parts.map((part, pIdx) => {
                   const cleanPart = part.replace(/[.,!?;:"()]/g, '');
                   const isWhitespace = /^\s+$/.test(part);
                   const card = getFlashcardForWord(cleanPart);
                   
                   if (isWhitespace || cleanPart === '') {
                     return <span key={pIdx}>{part}</span>;
                   }

                   if (card) {
                     return (
                       <span
                         key={pIdx}
                         onClick={(e) => handleWordClick(cleanPart, sentence, e)}
                         className={`cursor-pointer border-b-2 transition-colors font-semibold ${getTypeStyles(card.type)}`}
                       >
                         {part}
                       </span>
                     );
                   }
                   return (
                    <span 
                      key={pIdx} 
                      className="cursor-pointer hover:bg-yellow-100 hover:text-yellow-800 rounded px-0.5 transition-colors"
                      onClick={(e) => handleWordClick(cleanPart, sentence, e)}
                    >
                      {part}
                    </span>
                   );
                })}
                {sIdx < sentences.length - 1 && ' '}
              </span>
            );
          })}

          <div className="mt-12 pt-8 border-t border-gray-100">
            {nextSegmentMeta ? (
              <button
                onClick={handleNextPart}
                disabled={analyzingNext}
                className="w-full flex items-center justify-center bg-gray-900 text-white py-4 rounded-xl hover:bg-gray-800 transition shadow-lg shadow-gray-200"
              >
                {analyzingNext ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Next Part...
                  </>
                ) : (
                  <>
                    {nextSegmentMeta.isAnalyzed ? 'Read Next Part' : 'Analyze & Read Next Part'}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            ) : (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-xl">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>You have reached the end of this text.</p>
              </div>
            )}
          </div>
        </div>

        {showTranslation && segment.persianTranslation && (
          <div className="lg:col-span-4 bg-gray-50 p-6 rounded-2xl border border-gray-200 text-gray-700 leading-loose text-justify font-persian sticky top-36" dir="rtl">
            <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2 flex items-center">
              <Languages className="w-4 h-4 ml-2" />
              ترجمه فارسی
            </h3>
            {segment.persianTranslation}
          </div>
        )}
      </div>

      {/* Flashcard Modal */}
      {activeCard && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-[50] flex items-center justify-center p-4" onClick={() => setActiveCard(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveCard(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-2xl font-bold text-brand-700">{activeCard.word}</h2>
                <div className="flex gap-2 items-center">
                  <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${getTypeStyles(activeCard.type).split(' ')[0]}`}>
                    {activeCard.type === 'vocabulary' ? activeCard.level : activeCard.type}
                  </span>
                </div>
              </div>
              {activeCard.phonetic && <p className="text-gray-500 font-mono text-sm mb-4">/{activeCard.phonetic}/</p>}
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-gray-900 font-medium mb-1 text-sm uppercase tracking-wide">Meaning</p>
                  <p className="text-gray-600 text-lg leading-relaxed font-persian text-right" dir="rtl">{activeCard.persianTranslation}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Definition</p>
                  <p className="text-gray-700 text-sm">{activeCard.definition}</p>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
                  onClick={() => setActiveCard(null)} 
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedWordForAnalysis && (
         <div className="fixed inset-0 bg-black bg-opacity-30 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedWordForAnalysis(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-xs w-full p-5" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Analyze "{selectedWordForAnalysis.word}"?</h3>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setSelectedWordForAnalysis(null)}
                   className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmSingleAnalysis}
                   disabled={isAnalyzingSingle}
                   className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition flex justify-center items-center"
                 >
                   {isAnalyzingSingle ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
                 </button>
              </div>
            </div>
         </div>
      )}

      <PronunciationModal 
        isOpen={!!pronunciationText}
        onClose={() => setPronunciationText(null)}
        targetText={pronunciationText || ''}
      />
    </div>
  );
};