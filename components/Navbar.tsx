import React from 'react';
import { BookOpen, Layers, PlusCircle, Settings, Library } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-50';

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-brand-600 tracking-tight">LinguaFlow</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/" className={`inline-flex items-center px-4 py-2 border-b-2 border-transparent text-sm font-medium rounded-md ${isActive('/')}`}>
                <Layers className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
              <Link to="/cards" className={`inline-flex items-center px-4 py-2 border-b-2 border-transparent text-sm font-medium rounded-md ${isActive('/cards')}`}>
                <Library className="w-4 h-4 mr-2" />
                Cards
              </Link>
              <Link to="/import" className={`inline-flex items-center px-4 py-2 border-b-2 border-transparent text-sm font-medium rounded-md ${isActive('/import')}`}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Text
              </Link>
              <Link to="/review" className={`inline-flex items-center px-4 py-2 border-b-2 border-transparent text-sm font-medium rounded-md ${isActive('/review')}`}>
                <BookOpen className="w-4 h-4 mr-2" />
                Review
              </Link>
            </div>
          </div>
          <div className="flex items-center">
             <Link to="/settings" className={`p-2 rounded-full transition-colors ${location.pathname === '/settings' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                <Settings className="w-5 h-5" />
             </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};