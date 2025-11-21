import React from 'react';
import { ArrowLeft, GitCommit } from 'lucide-react';
import { Link } from 'react-router-dom';

const CHANGES = [
  {
    version: '1.8.0',
    features: [
      'Massive Scale Support: Rebuilt the storage engine using IndexedDB to support millions of characters and over 100,000 flashcards without slowing down',
      'New Card Library: A dedicated space to browse, search, and filter your entire collection of flashcards by type, level, or source text',
      'Advanced Study Plans: Create custom review sessions focusing specifically on certain types (e.g., Grammar only), levels (e.g., B2), or specific books',
      'Performance Boost: Implemented smart lazy loading and pagination to ensure the app remains lightning fast regardless of library size'
    ]
  },
  {
    version: '1.7.0',
    features: [
      'Enhanced Navigation: Quickly jump between any book parts using the new dropdown selector',
      'New Flashcard Types: Added support for Grammar, Literary Devices, and Historical Context cards',
      'Analysis Configuration: You can now toggle which types of cards to generate in Settings',
      'Custom Segment Length: Configure how many words (default 1200) are in each reading section',
      'Visual Coding: Color-coded highlighting for different types of learning items'
    ]
  },
  {
    version: '1.6.0',
    features: [
      'Added Native TTS Support: Switch to your device\'s built-in speech engine for offline, instant, and unlimited reading',
      'Seamless Audio Playback: Gemini TTS now buffers the next sentence in the background for gapless listening',
      'Improved Flashcard Review: Context text area is now scrollable, ensuring long sentences are fully readable',
      'Improved Audio Stability: Better handling of pause/resume and speed controls across different engines'
    ]
  },
  {
    version: '1.5.0',
    features: [
      'Reduced article segment limit to 2000 characters for better readability',
      'Fixed audio playback issues by optimizing browser audio context handling',
      'Improved text splitting logic to respect sentence boundaries better'
    ]
  },
  {
    version: '1.4.0',
    features: [
      'Added Custom AI Model support: You can now enter custom model IDs (e.g., tuned models) in Settings',
      'Fixed Text-to-Speech (TTS) playback reliability issues',
      'Added visual feedback for audio errors',
      'Improved settings interface with editable model fields'
    ]
  },
  {
    version: '1.3.0',
    features: [
      'Instant Analysis: Click any word while reading to create a flashcard instantly',
      'Improved Import: Detailed progress tracking and better error handling for new texts',
      'Review Filters: You can now filter flashcards by specific books or articles during review',
      'Enhanced text interaction in Reader mode'
    ]
  },
  {
    version: '1.2.0',
    features: [
      'Added "Book Mode" for importing long texts',
      'Automatic text splitting into manageable chapters/parts',
      'Lazy Analysis: Only analyze text segments when you reach them',
      'Improved Reader navigation between parts',
      'Performance improvements for large imports'
    ]
  },
  {
    version: '1.1.0',
    features: [
      'Added Settings page',
      'Option to select AI models for analysis, translation, and pronunciation',
      'Added Changelog section',
      'UI improvements in Review section',
      'Added phonetic transcriptions and part-of-speech tags',
      'Added playback speed controls',
      'Added sentence highlighting'
    ]
  },
  {
    version: '1.0.0',
    features: [
      'Initial release of LinguaFlow AI',
      'English text analysis and vocabulary extraction',
      'Context-aware intelligent flashcards',
      'Full text translation by AI',
      'Natural Text-to-Speech (TTS)',
      'Pronunciation evaluation with color-coded feedback'
    ]
  }
];

export const Changelog: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Link to="/settings" className="mr-4 text-gray-500 hover:text-brand-600 transition">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <GitCommit className="w-8 h-8 mr-3 text-brand-600" />
          Changelog
        </h1>
      </div>

      <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-0 before:w-0.5 before:bg-gray-200 pl-10">
        {CHANGES.map((release, idx) => (
          <div key={idx} className="relative">
            {/* Timeline Dot */}
            <div className="absolute -left-8 top-1.5 w-3 h-3 bg-brand-500 rounded-full border-4 border-white shadow-sm transform -translate-x-1/2"></div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block bg-brand-100 text-brand-800 text-xs px-2 py-1 rounded-full font-bold mb-2">
                    v{release.version}
                  </span>
                  <h3 className="text-lg font-bold text-gray-800">Version {release.version}</h3>
                </div>
              </div>
              
              <ul className="space-y-2">
                {release.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start text-gray-600">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};