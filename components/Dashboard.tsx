import React from 'react';
import { useAppStore } from '../store/AppContext';
import { Link } from 'react-router-dom';
import { FileText, Clock, ArrowRight, Plus, BookOpen } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { articles } = useAppStore();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Library</h1>
          <p className="text-gray-500 mt-1">Manage your texts and continue your learning journey.</p>
        </div>
        <Link to="/import" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 transition flex items-center font-medium shadow-sm shadow-brand-200">
          <Plus className="w-5 h-5 mr-2" />
          New Text
        </Link>
      </header>

      {articles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900">No texts yet</h3>
          <p className="text-gray-500 mt-2 mb-6">Add your first English text to start learning.</p>
          <Link to="/import" className="text-brand-600 font-medium hover:text-brand-800">
            Get Started &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(article => {
            // Find last analyzed segment or default to first
            const lastAnalyzed = [...article.segments].reverse().find(s => s.isAnalyzed) || article.segments[0];
            const segmentCount = article.segments.length;
            const totalWords = article.segments.reduce((acc, seg) => acc + seg.analyzedWords.length, 0);

            return (
              <Link key={article.id} to={`/read/${article.id}/${lastAnalyzed.index}`} className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-brand-600 transition-colors">
                      {article.title}
                    </h3>
                    {segmentCount > 1 && (
                       <span className="flex-shrink-0 bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center">
                         <BookOpen className="w-3 h-3 mr-1" />
                         {segmentCount} Parts
                       </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-3 mb-4 leading-relaxed">
                    {article.segments[0].content}
                  </p>
                </div>
                
                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-xs text-gray-500">
                     <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-medium">
                        Part {lastAnalyzed.index + 1}
                     </span>
                     <span>•</span>
                     <span>{totalWords} vocab items</span>
                   </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                    <div className="flex items-center text-gray-400 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(article.processedAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm font-medium text-brand-600">
                       Continue
                       <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};