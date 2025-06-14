import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './LanguageContext';
import React from 'react';

// Helper
const renderLanguageHook = () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider>{children}</LanguageProvider>
  );
  return renderHook(() => useLanguage(), { wrapper });
};

// --- Mocking Messages ---
vi.mock('../locales/es.json', async () => ({ default: { test_message: 'Hola ES', final_document_review_instructions: 'Instrucciones ES' } }));
vi.mock('../locales/ar.json', async () => ({ default: { test_message: 'مرحبا AR', final_document_review_instructions: 'تعليمات AR' } }));
vi.mock('../locales/ca.json', async () => ({ default: { test_message: 'Hola CA', final_document_review_instructions: 'Instruccions CA' } }));
vi.mock('../locales/fr.json', async () => ({ default: { test_message: 'Bonjour FR', final_document_review_instructions: 'Instructions FR' } }));
vi.mock('../locales/it.json', async () => ({ default: { test_message: 'Ciao IT', final_document_review_instructions: 'Istruzioni IT' } }));
vi.mock('../locales/zh.json', async () => ({ default: { test_message: '你好 ZH', final_document_review_instructions: '说明 ZH' } }));

// --- Mocking Flow Data Parts ---
// ES
vi.mock('../data/flowData.es.part1.json', async () => ({ default: { flow: [{ id: 'es_part1_q1' }] } }));
vi.mock('../data/flowData.es.part2.json', async () => ({ default: { flow: [{ id: 'es_part2_q1' }] } }));
vi.mock('../data/flowData.es.part3.json', async () => ({ default: { flow: [{ id: 'es_part3_q1' }] } }));

// AR
vi.mock('../data/flowData.ar.part1.json', async () => ({ default: { flow: [{ id: 'ar_part1_q1' }] } }));
vi.mock('../data/flowData.ar.part2.json', async () => ({ default: { flow: [{ id: 'ar_part2_q1' }] } }));
vi.mock('../data/flowData.ar.part3.json', async () => ({ default: { flow: [{ id: 'ar_part3_q1' }] } }));

// CA
vi.mock('../data/flowData.ca.part1.json', async () => ({ default: { flow: [{ id: 'ca_part1_q1' }] } }));
vi.mock('../data/flowData.ca.part2.json', async () => ({ default: { flow: [{ id: 'ca_part2_q1' }] } }));
vi.mock('../data/flowData.ca.part3.json', async () => ({ default: { flow: [{ id: 'ca_part3_q1' }] } }));

// FR
vi.mock('../data/flowData.fr.part1.json', async () => ({ default: { flow: [{ id: 'fr_part1_q1' }] } }));
vi.mock('../data/flowData.fr.part2.json', async () => ({ default: { flow: [{ id: 'fr_part2_q1' }] } }));
vi.mock('../data/flowData.fr.part3.json', async () => ({ default: { flow: [{ id: 'fr_part3_q1' }] } }));

// IT
vi.mock('../data/flowData.it.part1.json', async () => ({ default: { flow: [{ id: 'it_part1_q1' }] } }));
vi.mock('../data/flowData.it.part2.json', async () => ({ default: { flow: [{ id: 'it_part2_q1' }] } }));
vi.mock('../data/flowData.it.part3.json', async () => ({ default: { flow: [{ id: 'it_part3_q1' }] } }));

// ZH
vi.mock('../data/flowData.zh.part1.json', async () => ({ default: { flow: [{ id: 'zh_part1_q1' }] } }));
vi.mock('../data/flowData.zh.part2.json', async () => ({ default: { flow: [{ id: 'zh_part2_q1' }] } }));
vi.mock('../data/flowData.zh.part3.json', async () => ({ default: { flow: [{ id: 'zh_part3_q1' }] } }));

// Remove mock for single en.json flow data as it's no longer used in this context
// vi.mock('../data/flowData.en.json', async () => ({ default: { flow: [{ id: 'en_q1' }] } }));


describe('LanguageContext', () => {
  beforeEach(() => {
    vi.resetModules(); // Reset modules to ensure mocks are fresh for each test, especially for vi.doMock
  });

  it('should load Spanish (default) messages and merged flow data correctly', async () => {
    const { result } = renderLanguageHook();
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentLang).toBe('es');
    expect(result.current.loadedMessages?.test_message).toBe('Hola ES');
    expect(result.current.loadedFlowData?.flow).toHaveLength(3);
    expect(result.current.loadedFlowData?.flow.map(item => item.id)).toEqual([
      'es_part1_q1', 'es_part2_q1', 'es_part3_q1',
    ]);
  });

  const languagesToTest = [
    { code: 'ar', expectedMessage: 'مرحبا AR', part1Id: 'ar_part1_q1', part2Id: 'ar_part2_q1', part3Id: 'ar_part3_q1' },
    { code: 'ca', expectedMessage: 'Hola CA', part1Id: 'ca_part1_q1', part2Id: 'ca_part2_q1', part3Id: 'ca_part3_q1' },
    { code: 'fr', expectedMessage: 'Bonjour FR', part1Id: 'fr_part1_q1', part2Id: 'fr_part2_q1', part3Id: 'fr_part3_q1' },
    { code: 'it', expectedMessage: 'Ciao IT', part1Id: 'it_part1_q1', part2Id: 'it_part2_q1', part3Id: 'it_part3_q1' },
    { code: 'zh', expectedMessage: '你好 ZH', part1Id: 'zh_part1_q1', part2Id: 'zh_part2_q1', part3Id: 'zh_part3_q1' },
  ];

  languagesToTest.forEach(langTest => {
    it(`should load ${langTest.code} messages and merged flow data correctly when language is changed`, async () => {
      const { result } = renderLanguageHook();
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false)); // Initial 'es' load

      await act(async () => {
        result.current.changeLanguage(langTest.code);
      });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 2000 });

      expect(result.current.currentLang).toBe(langTest.code);
      expect(result.current.loadedMessages?.test_message).toBe(langTest.expectedMessage);
      expect(result.current.loadedFlowData?.flow).toHaveLength(3);
      expect(result.current.loadedFlowData?.flow.map(item => item.id)).toEqual([
        langTest.part1Id, langTest.part2Id, langTest.part3Id,
      ]);
    });
  });

  it('should fallback to Spanish if a non-existent language is selected and log warning', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderLanguageHook();
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.changeLanguage('xx'); // Non-existent language
    });
    // It will first try to load 'xx', fail, then load 'es'
    await vi.waitFor(() => {
        return !result.current.isLoading && result.current.currentLang === 'es';
    }, {timeout: 3000});

    expect(result.current.currentLang).toBe('es');
    expect(result.current.loadedMessages?.test_message).toBe('Hola ES');
    expect(result.current.loadedFlowData?.flow).toHaveLength(3);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Language code \"xx\" is not available. Defaulting to 'es'."));
    // The "Falling back to 'es' due to error loading 'xx'." message might also appear if the import itself fails.
    // Depending on how robust the error handling for failed dynamic imports is,
    // the number of warnings or specific messages might vary.
    // The key is that it ends up on 'es'.
    consoleWarnSpy.mockRestore();
  });

  it('should handle error loading default Spanish language (critical error)', async () => {
    // This specific test needs to be carefully managed due to vi.doMock's behavior
    // We need to ensure this mock override only applies to this test.
    // Resetting modules before and after helps isolate this.
    vi.resetModules();
    // Re-mock everything else normally for this test's scope if needed, or rely on top-level mocks if they are fine.
    // For this test, we only need to break the 'es' part1 import.
     vi.doMock('../data/flowData.es.part1.json', () => {
        throw new Error('Simulated critical load error for es part1');
     });
    // Re-import LanguageProvider to use the new mock
    const { LanguageProvider: PatchedLanguageProvider, useLanguage: usePatchedLanguage } = await import('./LanguageContext');

    const PatchedWrapper = ({ children }: { children: React.ReactNode }) => (
        <PatchedLanguageProvider>{children}</PatchedLanguageProvider>
    );

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePatchedLanguage(), { wrapper: PatchedWrapper });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentLang).toBe('es');
    expect(result.current.loadedMessages).toBeNull();
    expect(result.current.loadedFlowData).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Error loading locale data for es:"));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to load default language 'es'"));

    consoleErrorSpy.mockRestore();
    vi.resetModules(); // Clean up vi.doMock
  });
});
