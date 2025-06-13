import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Messages } from '../interfaces';
//import { IoArrowBack } from 'react-icons/io5';

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
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onLanguageSelected}
            className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
            aria-label="Go back"
          >
            {/* <IoArrowBack className="text-indigo-700 text-2xl" /> */}
          </button>
          <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 flex-grow text-center pr-10"> {/* Added pr-10 to offset the back button space */}
            {messages ? messages.language_selection_title : 'Select Your Language'}
          </h2>
        </div>
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
