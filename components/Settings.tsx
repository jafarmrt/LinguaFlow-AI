import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/AppContext';
import { AlertTriangle, Server, Settings as SettingsIcon, List, Volume2, BookOpen, CheckSquare, Download, Upload, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppSettings, AnalysisType } from '../types';

const PRESET_MODELS = {
  analysis: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview (High Intelligence)' },
  ],
  tts: [
    { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS' },
  ],
  generic: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
  ]
};

interface ModelSelectorProps {
  label: string;
  settingKey: keyof AppSettings;
  presets: { id: string; name: string }[];
  currentValue: string;
  onChange: (key: keyof AppSettings, value: any) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ label, settingKey, presets, currentValue, onChange }) => {
  const isCustom = !presets.some(p => p.id === currentValue);
  const [showCustomInput, setShowCustomInput] = useState(isCustom);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-brand-300 transition-colors">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {!showCustomInput ? (
        <div className="flex gap-2">
          <select
            value={currentValue}
            onChange={(e) => {
              if (e.target.value === 'custom_option') {
                setShowCustomInput(true);
              } else {
                onChange(settingKey, e.target.value);
              }
            }}
            className="flex-1 p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
          >
            {presets.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            <option value="custom_option" className="font-semibold text-brand-600">
              + Use Custom Model ID...
            </option>
          </select>
        </div>
      ) : (
        <div className="flex gap-2">
          <input 
            type="text"
            value={currentValue}
            onChange={(e) => onChange(settingKey, e.target.value)}
            placeholder="e.g., my-tuned-model-001"
            className="flex-1 p-2.5 bg-white border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
          />
          <button 
            onClick={() => setShowCustomInput(false)}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200"
          >
            Cancel
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2 flex items-center">
        Current Model ID: <code className="bg-gray-100 px-1 py-0.5 rounded ml-1 text-gray-600">{currentValue || 'N/A'}</code>
      </p>
    </div>
  );
};

export const Settings: React.FC = () => {
  const { settings, updateSettings, exportUserData, importUserData } = useAppStore();
  const APP_VERSION = "1.9.0";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Defensive check: Ensure settings exists before rendering
  if (!settings) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  // Safe access to arrays to prevent crashes if local storage is outdated
  const enabledTypes = Array.isArray(settings.enabledTypes) ? settings.enabledTypes : [];

  const handleChange = (key: keyof AppSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  const toggleType = (type: AnalysisType) => {
    const current = Array.isArray(settings.enabledTypes) ? settings.enabledTypes : [];
    if (current.includes(type)) {
      handleChange('enabledTypes', current.filter(t => t !== type));
    } else {
      handleChange('enabledTypes', [...current, type]);
    }
  };
  
  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (window.confirm("This will merge data from the backup file into your current library. Continue?")) {
              importUserData(file);
          }
      }
      // Reset
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <SettingsIcon className="w-8 h-8 mr-3 text-gray-700" />
          App Settings
        </h1>
        <div className="text-sm text-gray-500 font-mono">
          v{APP_VERSION}
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Data Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
             <h2 className="text-lg font-medium text-gray-800 flex items-center">
               <Database className="w-5 h-5 mr-2 text-brand-600" />
               Data Management
             </h2>
             <p className="text-sm text-gray-500 mt-1">
               Backup your progress or transfer it to another device.
             </p>
          </div>
          <div className="p-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button 
                   onClick={exportUserData}
                   className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 font-medium"
                 >
                    <Download className="w-5 h-5 mr-2 text-gray-500" />
                    Export Backup
                 </button>
                 
                 <button 
                   onClick={handleImportClick}
                   className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 font-medium"
                 >
                    <Upload className="w-5 h-5 mr-2 text-gray-500" />
                    Import Backup
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept=".json" 
                   onChange={handleFileChange}
                 />
             </div>
             <p className="text-xs text-gray-400 mt-3 text-center">
                Your data is stored safely in your browser. Use Export to create a physical backup file.
             </p>
          </div>
        </div>

        {/* Content Analysis Config */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
             <h2 className="text-lg font-medium text-gray-800 flex items-center">
               <BookOpen className="w-5 h-5 mr-2 text-brand-600" />
               Content Processing
             </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Segment Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Words per Section (Page Size)
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  min="500" 
                  max="5000" 
                  step="100"
                  value={settings.segmentLength || 1200}
                  onChange={(e) => handleChange('segmentLength', parseInt(e.target.value) || 1200)}
                  className="w-32 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <p className="text-sm text-gray-500">
                  Default is 1200 words. Smaller sections load faster; larger sections have more context.
                </p>
              </div>
            </div>

            {/* Analysis Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Flashcard Categories to Generate
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'vocabulary', label: 'Vocabulary (B2+)', desc: 'Advanced words, idioms' },
                  { id: 'grammar', label: 'Grammar Structures', desc: 'Complex syntax patterns' },
                  { id: 'literary', label: 'Literary Devices', desc: 'Metaphors, symbolism' },
                  { id: 'historical', label: 'Historical Context', desc: 'Cultural/History notes' },
                ].map((type) => (
                  <div 
                    key={type.id}
                    onClick={() => toggleType(type.id as AnalysisType)}
                    className={`cursor-pointer p-3 rounded-lg border flex items-start gap-3 transition-all ${
                      enabledTypes.includes(type.id as AnalysisType) 
                        ? 'border-brand-500 bg-brand-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                       enabledTypes.includes(type.id as AnalysisType) ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-400 bg-white'
                    }`}>
                      {enabledTypes.includes(type.id as AnalysisType) && <CheckSquare className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="block font-medium text-gray-900">{type.label}</span>
                      <span className="text-xs text-gray-500">{type.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TTS Engine Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
             <h2 className="text-lg font-medium text-gray-800 flex items-center">
               <Volume2 className="w-5 h-5 mr-2 text-brand-600" />
               Audio Playback Engine
             </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => handleChange('ttsEngine', 'gemini')}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${settings.ttsEngine === 'gemini' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${settings.ttsEngine === 'gemini' ? 'border-brand-600' : 'border-gray-400'}`}>
                    {settings.ttsEngine === 'gemini' && <div className="w-2 h-2 rounded-full bg-brand-600"></div>}
                  </div>
                  <span className="font-bold text-gray-900">Gemini AI (High Quality)</span>
                </div>
                <p className="text-xs text-gray-600 ml-6">
                  Uses Google's advanced AI voices. Sounds very natural but requires internet connection.
                </p>
              </div>

              <div 
                onClick={() => handleChange('ttsEngine', 'native')}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${settings.ttsEngine === 'native' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${settings.ttsEngine === 'native' ? 'border-brand-600' : 'border-gray-400'}`}>
                     {settings.ttsEngine === 'native' && <div className="w-2 h-2 rounded-full bg-brand-600"></div>}
                  </div>
                  <span className="font-bold text-gray-900">Device Native (Offline)</span>
                </div>
                <p className="text-xs text-gray-600 ml-6">
                  Uses your computer or phone's built-in voices. Faster, works offline, but sounds robotic.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Model Config */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800 flex items-center">
              <Server className="w-5 h-5 mr-2 text-brand-600" />
              AI Model Configuration
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure specific model versions. Only applies when "Gemini AI" is selected above.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <ModelSelector 
              label="Vocabulary Analysis" 
              settingKey="analysisModel" 
              presets={PRESET_MODELS.analysis} 
              currentValue={settings.analysisModel}
              onChange={handleChange}
            />
            <ModelSelector 
              label="Persian Translation" 
              settingKey="translationModel" 
              presets={PRESET_MODELS.generic} 
              currentValue={settings.translationModel}
              onChange={handleChange}
            />
            <ModelSelector 
              label="Pronunciation Feedback" 
              settingKey="pronunciationModel" 
              presets={PRESET_MODELS.generic} 
              currentValue={settings.pronunciationModel}
              onChange={handleChange}
            />
            {settings.ttsEngine === 'gemini' && (
              <ModelSelector 
                label="Text-to-Speech (TTS)" 
                settingKey="ttsModel" 
                presets={PRESET_MODELS.tts} 
                currentValue={settings.ttsModel}
                onChange={handleChange}
              />
            )}
          </div>
          
          <div className="bg-blue-50 px-6 py-4 border-t border-blue-100 flex items-start">
            <AlertTriangle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Custom models must be accessible via the Google GenAI API key provided in your environment. 
            </p>
          </div>
        </div>
      </div>

      {/* Changelog Link */}
      <div className="flex justify-center mt-8">
        <Link 
          to="/changelog" 
          className="flex items-center text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 hover:text-brand-600 transition px-6 py-3 rounded-lg shadow-sm"
        >
          <List className="w-5 h-5 mr-2" />
          View Changelog History
        </Link>
      </div>
    </div>
  );
};