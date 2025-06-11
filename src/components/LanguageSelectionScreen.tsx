import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Messages } from '../interfaces';

interface LanguageSelectionScreenProps {
  onLanguageSelected: () => void;
  messages: Messages | null; // For its own UI text, like the title
}

const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({ onLanguageSelected, messages }) => {
  const { availableLanguages, changeLanguage, currentLang } = useLanguage();

  const handleLanguageChange = (langCode: string) => {
    changeLanguage(langCode);
    onLanguageSelected();
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-indigo-700">
          {messages ? messages.language_selection_title : 'Select Your Language'}
        </h2>
        <div className="space-y-3">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-4 py-3 text-lg font-medium rounded-md transition-colors duration-150 ease-in-out
                ${lang.code === currentLang
                  ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:bg-indigo-100 focus:text-indigo-700'
                }
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionScreen;
