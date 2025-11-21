import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { CheckCircle, Circle, ArrowRight, Loader2 } from 'lucide-react';
import { AnalysisType, ArticleSegment } from '../types';

export const WordSelection: React.FC = () => {
  const { id, segmentIndex } = useParams<{ id: string; segmentIndex?: string }>();
  const { getArticleMetadata, getSegment, approveWordsForSegment } = useAppStore();
  const navigate = useNavigate();
  
  const currentIdx = segmentIndex ? parseInt(segmentIndex) : 0;
  const article = getArticleMetadata(id || '');
  const [segment, setSegment] = useState<ArticleSegment | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
      if (id) {
          setLoading(true);
          getSegment(id, currentIdx).then(s => {
              setSegment(s || null);
              setLoading(false);
          });
      }
  }, [id, currentIdx]);
  
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (segment) {
      setSelected(new Set(segment.analyzedWords.map(w => w.lemma)));
    }
  }, [segment]);

  if (!article) return <div>Article not found</div>;
  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;
  if (!segment) return <div>Segment not found</div>;

  const toggleWord = (lemma: string) => {
    const next = new Set(selected);
    if (next.has(lemma)) next.delete(lemma);
    else next.add(lemma);
    setSelected(next);
  };

  const handleConfirm = async () => {
    await approveWordsForSegment(article.id, currentIdx, Array.from(selected));
    navigate(`/read/${article.id}/${currentIdx}`);
  };

  const getTypeStyles = (type?: AnalysisType) => {
    switch(type) {
        case 'grammar': return { border: 'border-purple-200 hover:border-purple-400', bg: 'bg-purple-50', text: 'text-purple-800' };
        case 'literary': return { border: 'border-pink-200 hover:border-pink-400', bg: 'bg-pink-50', text: 'text-pink-800' };
        case 'historical': return { border: 'border-amber-200 hover:border-amber-400', bg: 'bg-amber-50', text: 'text-amber-800' };
        default: return { border: 'border-gray-200 hover:border-brand-300', bg: 'bg-white', text: 'text-blue-800' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Select Items to Learn</h1>
          <p className="text-gray-500 mt-1">
            {article.title} <span className="px-2 text-gray-300">|</span> Part {currentIdx + 1}
          </p>
        </div>
        <button
          onClick={handleConfirm}
          className="flex items-center bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium"
        >
          Start Reading Part {currentIdx + 1}
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>

      {segment.analyzedWords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No difficult vocabulary identified in this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segment.analyzedWords.map((word, idx) => {
            const isSelected = selected.has(word.lemma);
            const style = getTypeStyles(word.type);
            
            return (
              <div
                key={idx}
                onClick={() => toggleWord(word.lemma)}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 relative ${
                  isSelected ? `border-brand-500 bg-brand-50` : style.border + ' ' + style.bg
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{word.word}</h3>
                  <div className="flex gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.text} bg-opacity-20 bg-current`}>
                        {word.type === 'vocabulary' ? word.level : word.type}
                    </span>
                  </div>
                </div>
                {word.phonetic && (
                  <p className="text-gray-400 font-mono text-xs mb-2">/{word.phonetic}/</p>
                )}
                
                <p className="text-sm text-gray-600 mb-2 font-persian text-right" dir="rtl">{word.persianTranslation}</p>
                <p className="text-xs text-gray-400 italic border-t pt-2 mt-2 border-gray-100 line-clamp-2">
                  "{word.context}"
                </p>
                
                <div className="absolute top-4 right-4">
                  {isSelected ? (
                    <CheckCircle className="w-5 h-5 text-brand-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};