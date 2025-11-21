import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Article, ArticleSegment, Flashcard, AppSettings, Collection } from '../types';

interface LinguaFlowDB extends DBSchema {
  articles: {
    key: string;
    value: Article;
    indexes: { 'by-date': number };
  };
  segments: {
    key: string; // composite or unique id
    value: ArticleSegment;
    indexes: { 'by-article': string };
  };
  flashcards: {
    key: string;
    value: Flashcard;
    indexes: {
      'by-article': string;
      'by-stage': number;
      'by-review': number;
      'by-type': string;
      'by-level': string;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  collections: {
    key: string;
    value: Collection;
  };
}

const DB_NAME = 'lingua_flow_db';
const DB_VERSION = 1;

export class DatabaseService {
  private dbPromise: Promise<IDBPDatabase<LinguaFlowDB>>;

  constructor() {
    this.dbPromise = openDB<LinguaFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const articleStore = db.createObjectStore('articles', { keyPath: 'id' });
        articleStore.createIndex('by-date', 'processedAt');

        const segmentStore = db.createObjectStore('segments', { keyPath: 'id' });
        segmentStore.createIndex('by-article', 'articleId');

        const cardStore = db.createObjectStore('flashcards', { keyPath: 'id' });
        cardStore.createIndex('by-article', 'articleId');
        cardStore.createIndex('by-stage', 'stage');
        cardStore.createIndex('by-review', 'nextReview');
        cardStore.createIndex('by-type', 'type');
        cardStore.createIndex('by-level', 'level');

        db.createObjectStore('settings', { keyPath: 'id' });
        db.createObjectStore('collections', { keyPath: 'id' });
      },
    });
  }

  async getSettings(): Promise<AppSettings | undefined> {
    const db = await this.dbPromise;
    // @ts-ignore
    return db.get('settings', 'config');
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.dbPromise;
    // @ts-ignore
    await db.put('settings', { ...settings, id: 'config' });
  }

  async addArticle(article: Article, segments: ArticleSegment[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['articles', 'segments'], 'readwrite');
    
    const lightweightArticle = {
        ...article,
        segments: article.segments.map(s => ({ ...s, content: '', analyzedWords: [] }))
    };

    await tx.objectStore('articles').put(lightweightArticle);
    
    for (const segment of segments) {
      await tx.objectStore('segments').put({ ...segment, articleId: article.id } as any);
    }
    
    await tx.done;
  }

  async getArticles(): Promise<Article[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('articles', 'by-date');
  }

  async getArticle(id: string): Promise<Article | undefined> {
    const db = await this.dbPromise;
    return db.get('articles', id);
  }

  async getSegment(articleId: string, index: number): Promise<ArticleSegment | undefined> {
    const db = await this.dbPromise;
    const segments = await db.getAllFromIndex('segments', 'by-article', articleId);
    return segments.find(s => s.index === index);
  }

  async updateSegment(segment: ArticleSegment): Promise<void> {
    const db = await this.dbPromise;
    await db.put('segments', segment);
  }

  async addFlashcards(cards: Flashcard[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('flashcards', 'readwrite');
    for (const card of cards) {
      await tx.store.put(card);
    }
    await tx.done;
  }

  async updateFlashcard(card: Flashcard): Promise<void> {
    const db = await this.dbPromise;
    await db.put('flashcards', card);
  }
  
  async getFlashcard(id: string): Promise<Flashcard | undefined> {
    const db = await this.dbPromise;
    return db.get('flashcards', id);
  }

  async getDueFlashcards(limit = 50): Promise<Flashcard[]> {
    const db = await this.dbPromise;
    const now = Date.now();
    const range = IDBKeyRange.upperBound(now);
    const allDue = await db.getAllFromIndex('flashcards', 'by-review', range);
    return allDue.slice(0, limit);
  }

  async getNewFlashcards(limit = 50): Promise<Flashcard[]> {
    const db = await this.dbPromise;
    const allNew = await db.getAllFromIndex('flashcards', 'by-stage', 0);
    return allNew.slice(0, limit);
  }

  async getAllFlashcardsCount(): Promise<number> {
    const db = await this.dbPromise;
    return db.count('flashcards');
  }
  
  async queryFlashcards(criteria: {
    articleId?: string;
    type?: string;
    level?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Flashcard[]> {
    const db = await this.dbPromise;
    let results: Flashcard[] = [];

    if (criteria.articleId && criteria.articleId !== 'all') {
        results = await db.getAllFromIndex('flashcards', 'by-article', criteria.articleId);
    } else if (criteria.type && criteria.type !== 'all') {
        results = await db.getAllFromIndex('flashcards', 'by-type', criteria.type);
    } else if (criteria.level && criteria.level !== 'all') {
        results = await db.getAllFromIndex('flashcards', 'by-level', criteria.level);
    } else {
        results = await db.getAll('flashcards');
    }

    results = results.filter(c => {
        let match = true;
        if (criteria.articleId && criteria.articleId !== 'all' && c.articleId !== criteria.articleId) match = false;
        if (criteria.type && criteria.type !== 'all' && c.type !== criteria.type) match = false;
        if (criteria.level && criteria.level !== 'all' && c.level !== criteria.level) match = false;
        if (criteria.search) {
             const q = criteria.search.toLowerCase();
             if (!c.word.toLowerCase().includes(q) && !c.persianTranslation.includes(q)) match = false;
        }
        return match;
    });

    results.sort((a, b) => a.word.localeCompare(b.word));

    const start = criteria.offset || 0;
    const end = criteria.limit ? start + criteria.limit : results.length;
    
    return results.slice(start, end);
  }

  /**
   * Exports the entire database to a JSON object.
   */
  async exportDatabase(): Promise<any> {
    const db = await this.dbPromise;
    const tx = db.transaction(['articles', 'segments', 'flashcards', 'settings', 'collections'], 'readonly');
    
    const data = {
      version: 1,
      timestamp: Date.now(),
      articles: await tx.objectStore('articles').getAll(),
      segments: await tx.objectStore('segments').getAll(),
      flashcards: await tx.objectStore('flashcards').getAll(),
      settings: await tx.objectStore('settings').get('config'), // Assuming 'config' is the key
      collections: await tx.objectStore('collections').getAll(),
    };
    
    await tx.done;
    return data;
  }

  /**
   * Imports a data object into the database.
   * Uses upsert (put) to merge data.
   */
  async importDatabase(data: any): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['articles', 'segments', 'flashcards', 'settings', 'collections'], 'readwrite');

    if (data.articles) {
      for (const item of data.articles) await tx.objectStore('articles').put(item);
    }
    if (data.segments) {
      for (const item of data.segments) await tx.objectStore('segments').put(item);
    }
    if (data.flashcards) {
      for (const item of data.flashcards) await tx.objectStore('flashcards').put(item);
    }
    if (data.collections) {
      for (const item of data.collections) await tx.objectStore('collections').put(item);
    }
    if (data.settings) {
       // @ts-ignore
       await tx.objectStore('settings').put({ ...data.settings, id: 'config' });
    }

    await tx.done;
  }
}

export const dbService = new DatabaseService();