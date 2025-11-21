import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { Search, Filter, Tag, Book, GraduationCap, Layers, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { AnalysisType, Flashcard } from '../types';

export const FlashcardList: React.FC = () => {
  const { articles, searchFlashcards } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AnalysisType | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterArticle, setFilterArticle] = useState<string>('all');
  
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 50;

  // Fetch logic
  useEffect(() => {
      const fetchCards = async () => {
          setLoading(true);
          try {
             const results = await searchFlashcards({
                 articleId: filterArticle,
                 type: filterType,
                 level: filterLevel,
                 search: search,
                 limit: limit,
                 offset: page * limit
             });
             setCards(results);
          } catch (e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      
      // Debounce search
      const timeout = setTimeout(fetchCards, 300);
      return () => clearTimeout(timeout);
  }, [search, filterType, filterLevel, filterArticle, page]);

  // Reset page on filter change
  useEffect(() => {
      setPage(0);
  }, [search, filterType, filterLevel, filterArticle]);

  const getTypeBadgeStyles = (type: AnalysisType) => {
    switch(type) {
      case 'grammar': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'literary': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'historical': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-brand-100 text-brand-800 border-brand-200';
    }
  };

  const getArticleTitle = (id: string) => {
    const article = articles.find(a => a.id === id);
    return article ? article.title : 'Unknown';
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Layers className="w-8 h-8 mr-3 text-brand-600" />
            Card Library
          </h1>
          <p className="text-gray-500 mt-1">Browse and manage your collection.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {/* Search */}
           <div className="relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search words..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
             />
           </div>

           {/* Type Filter */}
           <div className="relative">
             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <select 
               value={filterType}
               onChange={(e) => setFilterType(e.target.value as any)}
               className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm appearance-none bg-white"
             >
               <option value="all">All Types</option>
               <option value="vocabulary">Vocabulary</option>
               <option value="grammar">Grammar</option>
               <option value="literary">Literary</option>
               <option value="historical">Historical</option>
             </select>
           </div>

           {/* Level Filter */}
           <div className="relative">
             <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <select 
               value={filterLevel}
               onChange={(e) => setFilterLevel(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm appearance-none bg-white"
             >
               <option value="all">All Levels</option>
               <option value="B1">B1</option>
               <option value="B2">B2</option>
               <option value="C1">C1</option>
               <option value="C2">C2</option>
             </select>
           </div>

           {/* Source Filter */}
           <div className="relative">
             <Book className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <select 
               value={filterArticle}
               onChange={(e) => setFilterArticle(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm appearance-none bg-white"
             >
               <option value="all">All Sources</option>
               {articles.map(a => (
                 <option key={a.id} value={a.id}>{a.title.length > 25 ? a.title.substring(0,25)+'...' : a.title}</option>
               ))}
             </select>
           </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
          <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600" /></div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No cards found</h3>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.id} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-900">{card.word}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wide border ${getTypeBadgeStyles(card.type)}`}>
                  {card.type === 'vocabulary' ? card.level : card.type}
                </span>
              </div>
              
              {card.phonetic && (
                <p className="text-xs text-gray-400 font-mono mb-3">/{card.phonetic}/</p>
              )}

              <div className="space-y-2">
                <p className="text-sm text-gray-700 font-persian text-right" dir="rtl">
                  {card.persianTranslation}
                </p>
                
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-500 italic line-clamp-2 border border-gray-100">
                  "{card.context}"
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                <span className="truncate max-w-[150px]" title={getArticleTitle(card.articleId)}>
                  <Book className="w-3 h-3 inline mr-1" />
                  {getArticleTitle(card.articleId)}
                </span>
                <span>
                   Stage: {card.stage}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center items-center mt-8 gap-4">
            <button 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500">Page {page + 1}</span>
            <button 
                onClick={() => setPage(p => p + 1)}
                disabled={cards.length < limit}
                className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
        </>
      )}
    </div>
  );
};