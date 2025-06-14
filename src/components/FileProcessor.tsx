// src/components/FileProcessor.tsx
import type { Messages, Person } from '../interfaces';

// --- AI Document Validation Function ---
async function validateDocumentWithAI(base64Image: string, documentType: string, messages: Messages) {
  const prompt = `Usted es una IA de verificación de documentos para una oficina de padrón municipal española. Analice esta imagen. ¿Es un documento '${documentType}' válido y legible? Si es así, extraiga todas las entidades significativas relevantes para el empadronamiento municipal. Responda ÚNICAMENTE con un objeto JSON. El objeto JSON debe tener una clave 'isValid' (booleana), una clave 'reason' (cadena, explicando por qué no es válido si isValid es falso, o 'Documento válido' si es válido), y una clave 'extractedData'. El valor de 'extractedData' debe ser un array de objetos, donde cada objeto representa una entidad extraída y tiene la siguiente estructura: {'fieldName': 'string', 'description': 'string', 'value': 'string'}. 'fieldName' debe ser un identificador camelCase para el tipo de dato (ej: 'nombreCompleto', 'numeroIdentificacion', 'fechaNacimiento'), 'description' debe ser una etiqueta legible por humanos en español para el campo (ej: 'Nombre Completo', 'Número de Identificación'), y 'value' es el valor extraído. Si no se pueden extraer datos o el documento no es válido, 'extractedData' debe ser un array vacío. No incluya nada antes ni después del objeto JSON.`;

  const chatHistory = [{
    role: "user",
    parts: [
      { text: prompt },
      { inlineData: { mimeType: "image/png", data: base64Image } }
    ]
  }];

  const payload = {
    contents: chatHistory,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          isValid: { type: "BOOLEAN" },
          reason: { type: "STRING" },
          extractedData: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                fieldName: { type: "STRING" },
                description: { type: "STRING" },
                value: { type: "STRING" }
              },
              required: ["fieldName", "value"]
            }
          }
        },
        required: ["isValid", "reason", "extractedData"]
      }
    }
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) {
      console.warn("Gemini API Key is not configured. Please check your .env file (VITE_GEMINI_API_KEY). Document validation will likely fail.");
      return { isValid: false, reason: messages.ai_api_key_not_configured || "API Key not configured.", extractedData: [] };
  }
  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  let jsonText = "";
  try {
    const response = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0 &&
        result.candidates[0].content.parts[0].text) {
       jsonText = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(jsonText);
      if (!parsedJson.extractedData || !Array.isArray(parsedJson.extractedData)) {
        parsedJson.extractedData = [];
      }
      return parsedJson;
    } else {
      console.error("Unexpected AI response structure for document validation:", result);
      return { isValid: false, reason: messages.ai_response_error, extractedData: [] };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error al llamar a la API de Gemini para validación:", errorMessage);
    return { isValid: false, reason: `${messages.ai_connection_error} ${errorMessage}`, extractedData: [] };
  }
}

export const processAndValidateFile = (
  file: File,
  documentType: string,
  messages: Messages
): Promise<{ isValid: boolean; reason: string; extractedData: Array<Record<string, any>>; base64?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      if (event.target && typeof event.target.result === 'string') {
        const base64Data = event.target.result.split(',')[1];
        try {
          const validationResult = await validateDocumentWithAI(base64Data, documentType, messages);
          resolve({ ...validationResult, base64: base64Data });
        } catch (error) {
          console.error("Error during validation call (should not happen if validateDocumentWithAI resolves):", error);
          resolve({
            isValid: false,
            reason: messages.ai_connection_error || "Validation processing error",
            extractedData: [],
            base64: base64Data
          });
        }
      } else {
        console.error("File could not be read as a base64 string or event.target is null.");
        resolve({
          isValid: false,
          reason: messages.file_read_error || "File read error",
          extractedData: []
        });
      }
    };
    reader.onerror = (error: unknown) => {
      console.error("Error reading file:", error instanceof Error ? error.message : String(error));
      resolve({
        isValid: false,
        reason: messages.file_read_error || "File read error",
        extractedData: []
      });
    };
    reader.readAsDataURL(file);
  });
};

export interface AIProcedureSummary {
  registrationAddress?: string;
  peopleToRegister: Person[];
  confidenceScore: number;
  reasoning: string;
}

export async function getAIProcedureSummary(
  procedureType: string,
  extractedDataAllDocsJson: string,
  messages: Messages
): Promise<AIProcedureSummary> {
  const prompt = `
Eres un experto en trámites de empadronamiento para el ayuntamiento de Hospitalet de Llobregat.
Tu tarea es analizar el tipo de trámite y la información extraída de los documentos proporcionados para determinar la dirección de empadronamiento final y la lista de personas a empadronar.

Tipo de Trámite (procedureType): "${procedureType}"

Información Extraída de Documentos (extractedDataAllDocsJson):
${extractedDataAllDocsJson}
El JSON 'Información Extraída de Documentos (extractedDataAllDocsJson)' es un objeto donde cada clave representa un documento (ej: 'nombreDocumento_indice') y su valor es un array de objetos, cada uno con 'fieldName', 'description', y 'value' correspondientes a los datos extraídos de ese documento.

Basándote en esta información:
1.  Determina la dirección de empadronamiento más probable. Si hay múltiples direcciones o información conflictiva, elige la que parezca más relevante para el trámite o indica si no se puede determinar con certeza.
2.  Compila una lista final de personas a empadronar. Cada persona debe tener "name" (nombre completo) y "id_number" (número de identificación). Adicionalmente, si es posible inferirlo de los datos o el tipo de trámite, añade un campo "relationToApplicant" (relación con el solicitante principal, ej: "self", "child", "spouse"). Si hay personas mencionadas pero sin suficiente identificación (nombre Y número de ID), exclúyelas de esta lista final pero menciónalo en tu razonamiento.
3.  Proporciona una puntuación de confianza (confidenceScore) entre 0 y 1 sobre la exactitud de tu respuesta.
4.  Explica tu razonamiento (reasoning) concisamente, detallando cómo llegaste a tus conclusiones y mencionando cualquier ambigüedad o información faltante.

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON con la siguiente estructura exacta. No incluyas NADA antes ni después del objeto JSON.
{
  "registrationAddress": "string",
  "peopleToRegister": [
    { "name": "string", "id_number": "string", "relationToApplicant": "string" }
  ],
  "confidenceScore": "number",
  "reasoning": "string"
}
`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          registrationAddress: { type: "STRING" },
          peopleToRegister: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                id_number: { type: "STRING" },
                relationToApplicant: { type: "STRING" }
              },
              required: ["name", "id_number"]
            }
          },
          confidenceScore: { type: "NUMBER" },
          reasoning: { type: "STRING" }
        },
        required: ["peopleToRegister", "confidenceScore", "reasoning"]
      }
    }
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("Gemini API Key is not configured for AI Procedure Summary.");
    return {
      peopleToRegister: [],
      confidenceScore: 0,
      reasoning: messages.ai_api_key_not_configured || "API Key for AI summary not configured.",
    };
  }

  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  let rawResponseText = "";

  try {
    const response = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      rawResponseText = await response.text();
      console.error(`AI Procedure Summary API error! Status: ${response.status}`, rawResponseText);
      return {
        peopleToRegister: [],
        confidenceScore: 0,
        reasoning: `${messages.ai_connection_error} Status: ${response.status}. ${rawResponseText}`,
      };
    }

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0 &&
        result.candidates[0].content.parts[0].text) {
      rawResponseText = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(rawResponseText) as AIProcedureSummary;
      if (!parsedJson.peopleToRegister || !parsedJson.reasoning || typeof parsedJson.confidenceScore === 'undefined') {
          console.error("AI Procedure Summary response missing required fields:", parsedJson);
          return {
              peopleToRegister: [],
              confidenceScore: 0,
              reasoning: messages.ai_response_error || "AI response structure is invalid (missing fields).",
              registrationAddress: parsedJson.registrationAddress
          };
      }
      return parsedJson;
    } else {
      console.error("Unexpected AI Procedure Summary response structure:", result);
      return {
        peopleToRegister: [],
        confidenceScore: 0,
        reasoning: messages.ai_response_error || "Unexpected AI response structure.",
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error calling/parsing AI Procedure Summary API:", errorMessage, "\nRaw response text:", rawResponseText);
    return {
      peopleToRegister: [],
      confidenceScore: 0,
      reasoning: `${messages.ai_connection_error} ${errorMessage}. Raw response: ${rawResponseText || "N/A"}`,
    };
  }
}

// --- New Translation Function ---
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = "es"
): Promise<string> {
  if (!text || text.trim() === "") {
    return "";
  }
  if (targetLang === sourceLang) {
    return text;
  }

  const prompt = `Translate the following text from ${sourceLang} to ${targetLang}.
Return ONLY the translated text, with no additional explanations or surrounding characters.
Original text: "${text}"`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("Gemini API Key is not configured for translation.");
    return text;
  }

  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Translation API error! Status: ${response.status}`, errorText);
      return text;
    }

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0 &&
        result.candidates[0].content.parts[0].text) {
      return result.candidates[0].content.parts[0].text.trim();
    } else {
      console.error("Unexpected translation API response structure:", result);
      return text;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error calling/parsing translation API:", errorMessage);
    return text;
  }
}
