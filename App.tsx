import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ArticleImport } from './components/ArticleImport';
import { WordSelection } from './components/WordSelection';
import { Reader } from './components/Reader';
import { Review } from './components/Review';
import { Settings } from './components/Settings';
import { Changelog } from './components/Changelog';
import { FlashcardList } from './components/FlashcardList';

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen bg-gray-50 font-sans text-left" dir="ltr">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cards" element={<FlashcardList />} />
            <Route path="/import" element={<ArticleImport />} />
            {/* Supports optional segment index, defaulting to 0 */}
            <Route path="/select-words/:id/:segmentIndex?" element={<WordSelection />} />
            <Route path="/read/:id/:segmentIndex?" element={<Reader />} />
            <Route path="/review" element={<Review />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </AppProvider>
  );
};

export default App;