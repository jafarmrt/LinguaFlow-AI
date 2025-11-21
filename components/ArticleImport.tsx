import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { analyzeTextForVocabulary } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Book, AlertCircle } from 'lucide-react';
import { nanoid } from 'nanoid';
import { ArticleSegment } from '../types';

export const ArticleImport: React.FC = () => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { addArticle, settings } = useAppStore();
  const navigate = useNavigate();

  const splitTextIntoSegments = (fullText: string, wordsPerChunk: number): string[] => {
    const words = fullText.split(/\s+/);
    const chunks: string[] = [];
    let currentChunkWords: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      currentChunkWords.push(words[i]);
      
      if (currentChunkWords.length >= wordsPerChunk) {
        const lastWord = words[i];
        if (lastWord.endsWith('.') || lastWord.endsWith('?') || lastWord.endsWith('!') || lastWord.endsWith('\n')) {
           chunks.push(currentChunkWords.join(' '));
           currentChunkWords = [];
        }
      }
    }
    
    if (currentChunkWords.length > 0) {
      chunks.push(currentChunkWords.join(' '));
    }

    return chunks;
  };

  const handleAnalyze = async () => {
    if (!text.trim() || !title.trim()) return;
    setLoading(true);
    setError(null);
    
    try {
      setStatusMessage("Processing text structure...");
      
      const rawSegments = splitTextIntoSegments(text, settings.segmentLength || 1200);
      
      const firstSegmentText = rawSegments[0];
      
      setStatusMessage(`Analyzing Part 1 of ${rawSegments.length} with AI...`);
      const analysis = await analyzeTextForVocabulary(
        firstSegmentText, 
        'B2', 
        settings.analysisModel,
        settings.enabledTypes
      );
      
      setStatusMessage("Saving content...");
      
      const segments: ArticleSegment[] = rawSegments.map((content, index) => ({
        id: nanoid(),
        index: index,
        title: `Part ${index + 1}`,
        content: content,
        analyzedWords: index === 0 ? analysis : [],
        approvedWordIds: [],
        isAnalyzed: index === 0,
      }));

      // This is now async and saves to DB
      const articleId = await addArticle(title, segments);
      
      setStatusMessage("Done! Redirecting...");
      
      setTimeout(() => {
         navigate(`/select-words/${articleId}/0`);
      }, 500);

    } catch (error: any) {
      console.error("Analysis failed", error);
      setError(error.message || "Failed to analyze text. Please check your internet connection or API limits.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Import New Text / Book</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Import Failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="e.g., The Great Gatsby (Full Book)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <div className="bg-blue-50 p-3 rounded-lg mb-2 text-sm text-blue-800 flex items-start">
            <Book className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <p>
              Text will be split into pages of ~{settings.segmentLength} words.
              Only Part 1 will be analyzed now. You can analyze subsequent parts as you read them.
            </p>
          </div>
          <textarea
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-lg leading-relaxed"
            placeholder="Paste the full chapter or book here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />
          <p className="text-right text-xs text-gray-400 mt-2">{text.split(/\s+/).length} words</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={loading || !text || !title}
            className={`flex items-center px-6 py-3 rounded-lg transition font-medium w-full sm:w-auto justify-center ${
              loading 
                ? 'bg-gray-100 text-brand-600 cursor-wait border border-gray-200' 
                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span className="animate-pulse">{statusMessage || 'Processing...'}</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Import & Analyze
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};