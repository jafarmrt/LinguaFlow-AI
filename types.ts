export enum DifficultyLevel {
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

export type AnalysisType = 'vocabulary' | 'grammar' | 'literary' | 'historical';

export interface WordAnalysis {
  type: AnalysisType; // NEW: Type of analysis
  word: string; // The anchor text or phrase
  lemma: string;
  phonetic?: string; // IPA pronunciation (mostly for vocab)
  partOfSpeech?: string; // e.g., noun, verb, adj
  collocations: string[]; // Common phrases/idioms
  context: string; // The sentence it appeared in
  level: DifficultyLevel | string; // CEFR or 'Advanced'
  definition: string; // Explanation/Definition
  persianTranslation: string;
  exampleSentence: string;
}

export interface Flashcard extends WordAnalysis {
  id: string;
  articleId: string;
  nextReview: number; // Timestamp
  stage: number; // For SRS (Spaced Repetition System)
  createdAt: number;
}

export interface ArticleSegment {
  id: string;
  index: number;
  title: string; // e.g., "Part 1"
  content: string;
  analyzedWords: WordAnalysis[];
  approvedWordIds: string[];
  persianTranslation?: string;
  isAnalyzed: boolean;
}

export interface Article {
  id: string;
  title: string;
  segments: ArticleSegment[];
  collectionId?: string;
  processedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
}

export interface AppSettings {
  analysisModel: string;
  translationModel: string;
  ttsModel: string;
  pronunciationModel: string;
  ttsEngine: 'gemini' | 'native';
  segmentLength: number; // Words per segment
  enabledTypes: AnalysisType[]; // What types to generate
}

export interface AppState {
  articles: Article[];
  collections: Collection[];
  flashcards: Flashcard[];
  knownLemmas: string[]; // Words the user marked as "Known"
  settings: AppSettings;
}