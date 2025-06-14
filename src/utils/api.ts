// src/utils/api.ts

async function extractTextFromDocument(file: File): Promise<string> {
  const apiEndpoint = import.meta.env.VITE_TEXT_EXTRACTION_API_URL;

  if (!apiEndpoint) {
    console.error("Text extraction API URL is not defined. Set VITE_TEXT_EXTRACTION_API_URL environment variable.");
    throw new Error("Text extraction API URL is not configured.");
  }

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream', // Explicitly set as per C# example
      },
      body: file // Send the File object directly as the body
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Text extraction API error! Status: ${response.status}`, errorText);
      throw new Error(`Text extraction failed with status: ${response.status}. Message: ${errorText}`);
    }

    const extractedText = await response.text();
    return extractedText;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error calling text extraction API:", errorMessage);
    // Re-throw the error so the calling component can handle it
    throw new Error(`Error calling text extraction API: ${errorMessage}`);
  }
}

// Export the function to make it available for import in other files
export { extractTextFromDocument };
