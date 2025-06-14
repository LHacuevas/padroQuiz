import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processAndValidateFile, getAIProcedureSummary, AIProcedureSummary } from './FileProcessor';
import type { Messages, Person } from '../interfaces';

// Mock a minimal messages object for testing
const mockMessages: Messages = {
  ai_response_error: 'AI response error',
  ai_connection_error: 'AI connection error',
  file_read_error: 'File read error',
  ai_api_key_not_configured: 'AI API key not configured',
} as Messages;

// Mock global fetch
global.fetch = vi.fn();

// Mock import.meta.env
vi.stubGlobal('import.meta.env', {
  VITE_GEMINI_API_KEY: 'test-api-key',
});

describe('FileProcessor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('import.meta.env', { VITE_GEMINI_API_KEY: 'test-api-key' });
  });

  describe('processAndValidateFile', () => {
    it('should correctly process a file and return successful validation', async () => {
      const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const documentType = 'DNI';
      const mockResponseData = {
        isValid: true,
        reason: 'Document is valid.',
        extractedData: { name: 'Test User', id_number: '12345678X' },
      };
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockResponseData) }] } }],
        }),
      });
      const result = await processAndValidateFile(mockFile, documentType, mockMessages);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=test-api-key'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('Document is valid.');
      expect(result.extractedData.name).toBe('Test User');
      expect(result.base64).toBeDefined();
    });

    it('should return failed validation if AI indicates invalid', async () => {
      const mockFile = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
      const documentType = 'Passport';
      const mockResponseData = { isValid: false, reason: 'Document is blurry.', extractedData: {} };
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(mockResponseData) }] } }] }),
      });
      const result = await processAndValidateFile(mockFile, documentType, mockMessages);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Document is blurry.');
    });

    it('should handle AI API error for processAndValidateFile', async () => {
      const mockFile = new File(['dummy content'], 'error.png', { type: 'image/png' });
      const documentType = 'NIE';
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: false, status: 500, json: async () => ({ error: 'Internal Server Error' }),
      });
      const result = await processAndValidateFile(mockFile, documentType, mockMessages);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain(mockMessages.ai_connection_error);
    });

    it('should handle unexpected AI response structure for processAndValidateFile', async () => {
        const mockFile = new File(['dummy content'], 'bad_response.png', { type: 'image/png' });
        const documentType = 'TIE';
        (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ candidates: [] }) });
        const result = await processAndValidateFile(mockFile, documentType, mockMessages);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe(mockMessages.ai_response_error);
    });

    it('should handle file reading error for processAndValidateFile', async () => {
      const mockFile = new File(['dummy content'], 'read_error.pdf', { type: 'application/pdf' });
      const documentType = 'Other';
      const originalFileReader = global.FileReader;
      global.FileReader = vi.fn(() => ({
        readAsDataURL: vi.fn(function(this: FileReader) {
          if (this.onerror) {
            const mockErrorEvent = new ProgressEvent('error') as any;
            mockErrorEvent.target = { error: new DOMException("Simulated read error") };
            setTimeout(() => this.onerror!(mockErrorEvent), 0);
          }
        }),
      })) as any;
      const result = await processAndValidateFile(mockFile, documentType, mockMessages);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe(mockMessages.file_read_error);
      expect(result.base64).toBeUndefined();
      global.FileReader = originalFileReader;
    });
  });

  describe('getAIProcedureSummary', () => {
    const procedureType = 'Alta en padrón';
    const extractedDataJson = JSON.stringify({ doc1: { name: 'John Doe' } });

    it('should return parsed summary on successful API call', async () => {
      const mockPerson: Person = { name: 'John Doe', id_number: '123X', relationToApplicant: 'self' };
      const mockAISummary: AIProcedureSummary = {
        registrationAddress: '123 Main St',
        peopleToRegister: [mockPerson],
        confidenceScore: 0.85,
        reasoning: 'Address found in doc1, person identified.',
      };
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockAISummary) }] } }],
        }),
      });

      const result = await getAIProcedureSummary(procedureType, extractedDataJson, mockMessages);

      expect(fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (fetch as vi.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=test-api-key');
      const payload = JSON.parse(fetchCall[1].body);
      expect(payload.contents[0].parts[0].text).toContain(procedureType);
      expect(payload.contents[0].parts[0].text).toContain(extractedDataJson);
      expect(result).toEqual(mockAISummary);
    });

    it('should handle API error (non-ok response)', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error" // Changed to text() as per FileProcessor
      });

      const result = await getAIProcedureSummary(procedureType, extractedDataJson, mockMessages);
      expect(result.peopleToRegister).toEqual([]);
      expect(result.confidenceScore).toBe(0);
      expect(result.reasoning).toContain(mockMessages.ai_connection_error);
      expect(result.reasoning).toContain("Status: 500. Internal Server Error");
    });

    it('should handle malformed JSON response from AI', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "This is not JSON" }] } }],
        }),
      });
      const result = await getAIProcedureSummary(procedureType, extractedDataJson, mockMessages);
      expect(result.peopleToRegister).toEqual([]);
      expect(result.confidenceScore).toBe(0);
      expect(result.reasoning).toContain(mockMessages.ai_connection_error); // JSON parsing error falls into general catch
      expect(result.reasoning).toContain("This is not JSON");
    });

    it('should handle AI response missing required fields', async () => {
        const incompleteResponse = { registrationAddress: "123 Main St" }; // Missing peopleToRegister, confidence, reasoning
        (fetch as vi.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify(incompleteResponse) }] } }],
          }),
        });
        const result = await getAIProcedureSummary(procedureType, extractedDataJson, mockMessages);
        expect(result.peopleToRegister).toEqual([]);
        expect(result.confidenceScore).toBe(0);
        expect(result.reasoning).toEqual(mockMessages.ai_response_error || "AI response structure is invalid (missing fields).");
      });

    it('should handle missing API key', async () => {
      vi.stubGlobal('import.meta.env', { VITE_GEMINI_API_KEY: '' }); // Simulate missing API key
      const result = await getAIProcedureSummary(procedureType, extractedDataJson, mockMessages);
      expect(fetch).not.toHaveBeenCalled();
      expect(result.reasoning).toBe(mockMessages.ai_api_key_not_configured);
      expect(result.confidenceScore).toBe(0);
    });
  });
});
