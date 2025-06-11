import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import type { Messages, FlowData } from '../interfaces'; // Assuming these are correctly defined

interface LanguageOption {
  code: string;
  name: string;
}

export interface LanguageContextShape {
  currentLang: string;
  loadedMessages: Messages | null;
  loadedFlowData: FlowData | null;
  changeLanguage: (langCode: string) => void;
  availableLanguages: LanguageOption[];
  isLoading: boolean;
}

const availableLanguages: LanguageOption[] = [
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية' },
  { code: 'ca', name: 'Català' },
  { code: 'it', name: 'Italiano' },
  { code: 'fr', name: 'Français' },
  { code: 'zh', name: '中文' },
];

export const LanguageContext = createContext<LanguageContextShape | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<string>('es');
  const [loadedMessages, setLoadedMessages] = useState<Messages | null>(null);
  const [loadedFlowData, setLoadedFlowData] = useState<FlowData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const changeLanguage = (langCode: string) => {
    if (availableLanguages.find(lang => lang.code === langCode)) {
      setCurrentLang(langCode);
    } else {
      console.warn(`Language code "${langCode}" is not available. Defaulting to 'es'.`);
      setCurrentLang('es');
    }
  };

  useEffect(() => {
    const loadLocaleData = async (lang: string) => {
      setIsLoading(true);
      try {
        const messagesModule = await import(`../locales/${lang}.json`);
        const flowDataModule = await import(`../data/flowData.${lang}.json`);

        let messagesData: Messages = messagesModule.default;
        let flowData: FlowData = flowDataModule.default;

        // Perform final_document_review_instructions_key replacement
        if (flowData && messagesData && messagesData.final_document_review_instructions) {
          const processedFlow = flowData.flow.map(item => {
            if (item.id === "final_document_review" && item.text === "final_document_review_instructions_key") {
              return { ...item, text: messagesData.final_document_review_instructions };
            }
            return item;
          });
          flowData = { ...flowData, flow: processedFlow };
        } else {
          console.warn('Could not process final_document_review_instructions_key due to missing data.');
        }

        setLoadedMessages(messagesData);
        setLoadedFlowData(flowData);
      } catch (error) {
        console.error(`Error loading locale data for ${lang}:`, error);
        // Fallback to Spanish if the selected language fails to load
        if (lang !== 'es') {
          console.warn(`Falling back to 'es' due to error loading '${lang}'.`);
          setCurrentLang('es'); // This will trigger a re-load with 'es'
        } else {
          // If 'es' itself fails, this is a critical error.
          // For now, we'll just log it. A more robust app might show an error UI.
          console.error("Failed to load default language 'es'. Application might not work correctly.");
          setLoadedMessages(null); // Or some error messages
          setLoadedFlowData(null); // Or some error flow
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLocaleData(currentLang);
  }, [currentLang]);

  return (
    <LanguageContext.Provider value={{ currentLang, loadedMessages, loadedFlowData, changeLanguage, availableLanguages, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextShape => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
