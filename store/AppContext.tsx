import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Article, ArticleSegment, Collection, Flashcard, AppState, WordAnalysis, AppSettings, AnalysisType } from '../types';
import { nanoid } from 'nanoid';
import { dbService } from '../services/db';

interface AppContextType {
  articles: Article[];
  collections: Collection[];
  settings: AppSettings;
  isLoading: boolean;
  
  addArticle: (title: string, segments: ArticleSegment[], collectionId?: string) => Promise<string>;
  addCollection: (name: string, description?: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  
  getSegment: (articleId: string, index: number) => Promise<ArticleSegment | undefined>;
  updateSegmentTranslation: (articleId: string, segmentIndex: number, translation: string) => Promise<void>;
  updateSegmentAnalysis: (articleId: string, segmentIndex: number, analysis: WordAnalysis[]) => Promise<void>;
  
  approveWordsForSegment: (articleId: string, segmentIndex: number, selectedLemmas: string[]) => Promise<void>;
  addCustomWordToSegment: (articleId: string, segmentIndex: number, analysis: WordAnalysis) => Promise<void>;
  markCardReviewed: (cardId: string, quality: number) => Promise<void>;
  
  getCardsForSession: (mode: 'due' | 'new' | 'all', filters: any, limit?: number) => Promise<Flashcard[]>;
  searchFlashcards: (filters: { articleId?: string, type?: string, level?: string, search?: string, limit?: number, offset?: number }) => Promise<Flashcard[]>;
  getArticleMetadata: (id: string) => Article | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  analysisModel: 'gemini-2.5-flash',
  translationModel: 'gemini-2.5-flash',
  ttsModel: 'gemini-2.5-flash-preview-tts',
  pronunciationModel: 'gemini-2.5-flash',
  ttsEngine: 'gemini',
  segmentLength: 1200, 
  enabledTypes: ['vocabulary', 'grammar', 'literary', 'historical']
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dbArticles, dbSettings] = await Promise.all([
          dbService.getArticles(),
          dbService.getSettings()
        ]);
        setArticles(dbArticles.reverse());
        if (dbSettings) {
            setSettings({ ...DEFAULT_SETTINGS, ...dbSettings });
        }
      } catch (e) {
        console.error("Failed to load DB data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addCollection = (name: string, description?: string) => {
    const newCol: Collection = { id: nanoid(), name, description };
    setCollections(prev => [...prev, newCol]);
  };

  const addArticle = async (title: string, segments: ArticleSegment[], collectionId?: string): Promise<string> => {
    const id = nanoid();
    const newArticle: Article = {
      id,
      title,
      segments: segments, // Important: We save this to DB, but Context state keeps it light
      collectionId,
      processedAt: Date.now(),
    };
    
    await dbService.addArticle(newArticle, segments);
    
    // Keep memory light: don't store content in React state
    const lightweightArticle = {
        ...newArticle,
        segments: segments.map(s => ({ ...s, content: '', analyzedWords: [] }))
    };
    setArticles(prev => [lightweightArticle, ...prev]);
    
    return id;
  };

  const getSegment = async (articleId: string, index: number) => {
    return dbService.getSegment(articleId, index);
  };

  const updateSegmentTranslation = async (articleId: string, segmentIndex: number, translation: string) => {
    const segment = await dbService.getSegment(articleId, segmentIndex);
    if (segment) {
        const updated = { ...segment, persianTranslation: translation };
        await dbService.updateSegment(updated);
    }
  };

  const updateSegmentAnalysis = async (articleId: string, segmentIndex: number, analysis: WordAnalysis[]) => {
    const segment = await dbService.getSegment(articleId, segmentIndex);
    if (segment) {
        const updated = { ...segment, analyzedWords: analysis, isAnalyzed: true };
        await dbService.updateSegment(updated);
        
        setArticles(prev => prev.map(a => {
            if (a.id !== articleId) return a;
            const newSegs = a.segments.map(s => s.index === segmentIndex ? { ...s, isAnalyzed: true } : s);
            return { ...a, segments: newSegs };
        }));
    }
  };

  const approveWordsForSegment = async (articleId: string, segmentIndex: number, selectedLemmas: string[]) => {
    const segment = await dbService.getSegment(articleId, segmentIndex);
    if (!segment) return;

    const newFlashcards: Flashcard[] = segment.analyzedWords
      .filter(w => selectedLemmas.includes(w.lemma))
      .map(w => ({
        ...w,
        id: nanoid(),
        articleId,
        nextReview: Date.now(),
        stage: 0,
        createdAt: Date.now(),
      }));
    
    await dbService.addFlashcards(newFlashcards);
    
    const updatedSegment = { ...segment, approvedWordIds: selectedLemmas };
    await dbService.updateSegment(updatedSegment);
  };

  const addCustomWordToSegment = async (articleId: string, segmentIndex: number, analysis: WordAnalysis) => {
    const segment = await dbService.getSegment(articleId, segmentIndex);
    if (!segment) return;

    const exists = segment.analyzedWords.some(w => w.lemma === analysis.lemma);
    if (!exists) {
        const updatedSegment = {
            ...segment,
            analyzedWords: [...segment.analyzedWords, analysis],
            approvedWordIds: [...segment.approvedWordIds, analysis.lemma]
        };
        await dbService.updateSegment(updatedSegment);
    }

    const newCard: Flashcard = {
        ...analysis,
        id: nanoid(),
        articleId,
        nextReview: Date.now(),
        stage: 0,
        createdAt: Date.now(),
    };
    await dbService.addFlashcards([newCard]);
  };

  const markCardReviewed = async (cardId: string, quality: number) => {
    // We have to fetch the card to know its current stage
    // Optimized: In a real app, we'd pass the card object, but keeping signature simple
    // We'll implement a quick fetch in DB service if needed, but for now query by ID
    // Note: dbService.getFlashcard isn't defined in previous step, let's use raw db access or add it.
    // We will rely on a 'search' or just assume we can get it.
    // For this scale, we need to ensure we can get a single card.
    // Let's assume the calling component has the card data, but the interface is ID.
    // We'll update the DB directly.
    
    // NOTE: In production, `dbService` should expose `getCard(id)`.
    // I will cheat slightly and assume `dbService` has it or I'll do a scan? No, scan is bad.
    // `idb`'s `get` works for key.
    
    // I will assume dbService is imported.
    // Accessing private db promise is tricky.
    // Let's just implement the logic in `db.ts`?
    // No, logic belongs here.
    
    // Let's update `db.ts` to include `getFlashcard`.
    // Since I can't edit `db.ts` twice in one prompt easily without confusion, I'll assume I added `getFlashcard` to `db.ts`.
    // Wait, I haven't added it yet. I will update `db.ts` in the XML to include `getFlashcard`.
    
    // See below for `db.ts` update.
  };
  
  // Re-implementing markCardReviewed with the assumption that `db.ts` has `getFlashcard`
  const markCardReviewedReal = async (cardId: string, quality: number) => {
      const card = await dbService.getFlashcard(cardId);
      if (!card) return;
      
      let newStage = card.stage;
      let intervalDays = 1;

      if (quality >= 3) {
        newStage += 1;
        intervalDays = Math.pow(2, newStage);
      } else {
        newStage = 0;
        intervalDays = 0;
      }

      const nextReview = Date.now() + (intervalDays * 24 * 60 * 60 * 1000);
      const updated = { ...card, stage: newStage, nextReview };
      await dbService.updateFlashcard(updated);
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await dbService.saveSettings(updated);
  };

  const searchFlashcards = async (filters: any) => {
      return dbService.queryFlashcards(filters);
  };

  const getCardsForSession = async (mode: 'due' | 'new' | 'all', filters: any, limit = 50) => {
      let cards: Flashcard[] = [];
      if (mode === 'due') {
          cards = await dbService.getDueFlashcards(limit);
      } else if (mode === 'new') {
          cards = await dbService.getNewFlashcards(limit);
      } else {
          cards = await dbService.queryFlashcards({ ...filters, limit });
      }
      
      // Filter by article/type/level if mode was specific
      if (filters.type && filters.type !== 'all') cards = cards.filter(c => c.type === filters.type);
      if (filters.level && filters.level !== 'all') cards = cards.filter(c => c.level === filters.level);
      if (filters.articleId && filters.articleId !== 'all') cards = cards.filter(c => c.articleId === filters.articleId);
      
      // Shuffle
      return cards.sort(() => Math.random() - 0.5);
  };

  const getArticleMetadata = (id: string) => articles.find(a => a.id === id);

  return (
    <AppContext.Provider value={{
      articles,
      collections,
      settings,
      isLoading,
      addArticle,
      addCollection,
      updateSettings,
      getSegment,
      updateSegmentTranslation,
      updateSegmentAnalysis,
      approveWordsForSegment,
      addCustomWordToSegment,
      markCardReviewed: markCardReviewedReal,
      searchFlashcards,
      getCardsForSession,
      getArticleMetadata
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};