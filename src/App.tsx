import React, { useState, useEffect, useRef, useMemo } from 'react'; // Added useMemo to main React import
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'; // Import FirebaseUser type
import { doc, getDoc, setDoc } from 'firebase/firestore';
//import { Upload, XCircle, CheckCircle, Trash2, Home, User, FileText, CheckSquare, Settings, Send } from 'lucide-react'; // Icons
import { db, auth, initialAuthToken, aId as appId } from './firebaseConfig';
import { useLanguage } from './contexts/LanguageContext'; // Import useLanguage
// Import new components
import Breadcrumbs from './components/Breadcrumbs';
import ConfirmationModal from './components/ConfirmationModal';
import QuestionnaireScreen from './components/QuestionnaireScreen';
import FinalDocumentReviewScreen from './components/FinalDocumentReviewScreen';
import SummaryScreen from './components/SummaryScreen';
import LanguageSelectionScreen from './components/LanguageSelectionScreen'; // Import LanguageSelectionScreen
// Import necessary types/interfaces
// Import new components
/* import Breadcrumbs from './components/Breadcrumbs';
import ConfirmationModal from './components/ConfirmationModal';
import QuestionnaireScreen from './components/QuestionnaireScreen';
import FinalDocumentReviewScreen from './components/FinalDocumentReviewScreen';
import SummaryScreen from './components/SummaryScreen'; */
// Import necessary types/interfaces
import type { FlowStep, UploadedFiles, Person, FlowPathEntry, FlowData, DocumentRequirement, UploadedFileEntry, Messages } from './interfaces'; // Added Messages type


// --- AI Document Validation Function ---
async function validateDocumentWithAI(base64Image: string, documentType: string, messages: Messages) { // Added messages argument
  const prompt = `Usted es una IA de verificación de documentos para una oficina de padrón municipal española. Analice esta imagen. ¿Es un documento '${documentType}' válido y legible? Si es un documento de identidad (DNI, NIE, Pasaporte, TIE, Pasaporte extranjero), extraiga el nombre completo y el número de identificación. Si no, indique la razón claramente en español. Responda en formato JSON: { "isValid": boolean, "reason": "string", "extractedData": { "name": "string", "id_number": "string" } }.`;

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
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              id_number: { type: "STRING" }
            }
          }
        }
      }
    }
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) {
      console.warn("Gemini API Key is not configured. Please check your .env file (VITE_GEMINI_API_KEY). Document validation will likely fail.");
  }
  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
let jsonText = ""; // Initialize jsonText variable
  try {
    const response = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
       jsonText = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(jsonText);
      return parsedJson;
    } else {
      return { isValid: false, reason: messages.ai_response_error, extractedData: {} };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error al llamar a la API de Gemini:", errorMessage);
    return { isValid: false, reason: `${messages.ai_connection_error} ${errorMessage}`, extractedData: {jsonText} };
  }
}

// --- Main App Component ---
function App() {
  const {
    currentLang, // Though currentLang from context might not be directly used in App if not needed for logic here
    loadedMessages,
    loadedFlowData,
    isLoading: isLanguageLoading
  } = useLanguage();

  // const [flowData, setFlowData] = useState<FlowData | null>(null); // Removed, use loadedFlowData from context
  const [isLanguageSelected, setIsLanguageSelected] = useState<boolean>(false); // State for language selection
  const [currentQuestionId, setCurrentQuestionId] = useState<string>("q1_action_type");
  const [questionsAnswered, setQuestionsAnswered] = useState<string[]>([]); // To track history for 'Atrás'
  const [currentStepDocs, setCurrentStepDocs] = useState<DocumentRequirement[]>([]); // Documents for the current step (not cumulative)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({}); // Stores ALL uploaded files by doc.name: [{file, base64, status, message, extractedData}]
  const [loadingValidation, setLoadingValidation] = useState<boolean>(false);
  const [peopleToRegister, setPeopleToRegister] = useState<Person[]>([]); // People extracted from validated ID documents
  const [registrationAddress, setRegistrationAddress] = useState<string>("Dirección de empadronamiento");
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddressEdit, setShowAddressEdit] = useState<boolean>(false);
  const [tempAddress, setTempAddress] = useState<string>("");
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({}); // Refs for file inputs
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [nextIdAfterConfirmation, setNextIdAfterConfirmation] = useState<string | null>(null);
  const [sendingData, setSendingData] = useState<boolean>(false);
  const [apiResponseMessage, setApiResponseMessage] = useState<string>("");
  // New state for breadcrumbs
  const [flowPath, setFlowPath] = useState<FlowPathEntry[]>([{ id: "start", text: "Inicio" }]); // Initial text, will be updated by effect below

  const handleLanguageSelected = () => {
    setIsLanguageSelected(true);
  };

  // This effect rebuilds the entire flowPath when the language changes,
  // ensuring all breadcrumb texts are in the current language.
  useEffect(() => {
    if (loadedMessages && loadedFlowData) {
      const newFlowPath: FlowPathEntry[] = [{ id: "start", text: loadedMessages.breadcrumb_home }];

      questionsAnswered.forEach(questionId => {
        const step = loadedFlowData.flow.find(q => q.id === questionId);
        if (step) {
          const stepText = step.question || step.text || step.id;
          newFlowPath.push({ id: step.id, text: stepText as string });
        }
      });

      // Add the current question to the path, if it's not already the start
      if (currentQuestionId !== "start" && !questionsAnswered.includes(currentQuestionId)) {
         const currentStepDetails = loadedFlowData.flow.find(q => q.id === currentQuestionId);
         if (currentStepDetails) {
            const currentStepText = currentStepDetails.question || currentStepDetails.text || currentStepDetails.id;
            // Avoid duplicating the last step if it's already the current question
            if (newFlowPath.length === 0 || newFlowPath[newFlowPath.length -1].id !== currentQuestionId) {
                 newFlowPath.push({id: currentQuestionId, text: currentStepText as string});
            }
         }
      }
       // If flowPath is just "start" and currentQuestionId is also "start", it's fine.
      // If flowPath has history, and currentQuestionId is "start", it means user navigated back to home.
      // In this case, newFlowPath is already correctly set to just the home entry.
      // However, if questionsAnswered is empty and currentQuestionId is not 'start' (e.g. initial load to a deep link - though not supported yet)
      // this logic needs to be robust. The current logic for adding currentQuestionId handles this.

      setFlowPath(newFlowPath);
    }
  }, [currentLang, loadedMessages, loadedFlowData, questionsAnswered, currentQuestionId]); // Ensure all dependencies are listed


  // --- Firebase Integration ---
  useEffect(() => {
    if (!auth || !db) {
      console.error("Firebase auth or db is not initialized. Check firebaseConfig.ts.");
      setIsAuthReady(true); // Allow app to proceed, but Firebase features might not work
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        setUserId(user.uid);
        // Load user data from Firestore
        const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/padron_data/user_progress`);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const savedData = docSnap.data();
          setCurrentQuestionId(savedData.currentQuestionId || "q1_action_type");
          setQuestionsAnswered(savedData.questionsAnswered || []);
          setUploadedFiles(savedData.uploadedFiles || {});
          setPeopleToRegister(savedData.peopleToRegister || []);
          setRegistrationAddress(savedData.registrationAddress || "Dirección de empadronamiento");
          // flowPath will be rebuilt by the specific useEffect listening to currentLang,
          // loadedMessages, loadedFlowData, questionsAnswered, and currentQuestionId.
          // So, we just set the IDs here, and the text will be repopulated.
          const savedFlowPathIds = (savedData.flowPath || []).map((entry: FlowPathEntry) => entry.id);
          if (savedFlowPathIds.length > 0 && savedData.flowPath[0].id === "start") {
             // We'll let the main effect rebuild it with correct text
          } else if (loadedMessages) { // Fallback if savedFlowPath is weird or empty
            setFlowPath([{ id: "start", text: loadedMessages.breadcrumb_home }]);
          } else {
            setFlowPath([{ id: "start", text: "Inicio" }]);
          }
        } else if (loadedMessages) { // If no saved data, initialize with home breadcrumb
            setFlowPath([{ id: "start", text: loadedMessages.breadcrumb_home }]);
        }
        setIsAuthReady(true);
      } else {
        if (initialAuthToken) {
          try {
            await signInWithCustomToken(auth, initialAuthToken);
            // Assuming onAuthStateChanged will be triggered again with the new user
          } catch (error: unknown) {
            console.error("Error signing in with custom token:", error instanceof Error ? error.message : String(error));
            // Fallback to anonymous sign-in if custom token fails
            try {
              const anonUser = await signInAnonymously(auth);
              setUserId(anonUser.user.uid);
            } catch (anonError: unknown) {
              console.error("Error signing in anonymously after custom token failure:", anonError instanceof Error ? anonError.message : String(anonError));
            }
            setIsAuthReady(true);
          }
        } else {
          try {
            const anonUser = await signInAnonymously(auth);
            setUserId(anonUser.user.uid);
          } catch (anonError: unknown) {
            console.error("Error signing in anonymously:", anonError instanceof Error ? anonError.message : String(anonError));
          }
          setIsAuthReady(true);
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db, appId, initialAuthToken]);

  // Save data to Firestore whenever relevant state changes
  useEffect(() => {
    const saveData = async () => {
      if (isAuthReady && userId && db && appId) { // Ensure db and appId are available
        try {
          const filesToSave: { [key: string]: Partial<Omit<UploadedFileEntry, 'file'>>[] } = {};
          for (const docName in uploadedFiles) {
            filesToSave[docName] = uploadedFiles[docName].map((fileEntry: UploadedFileEntry) => {
              const { file: _unusedFile, ...rest } = fileEntry; // Explicitly mark 'file' as unused
              return rest;
            });
          }

          const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/padron_data/user_progress`);
          await setDoc(userDocRef, {
            currentQuestionId,
            questionsAnswered,
            uploadedFiles: filesToSave, // Use the cleaned object without File objects
            peopleToRegister,
            registrationAddress,
            flowPath // Save flowPath
          }, { merge: true });
          console.log("Data saved to Firestore.");
        } catch (e: unknown) {
          console.error("Error saving document: ", e instanceof Error ? e.message : String(e));
        }
      }
    };
    if (isAuthReady) { // Only save after auth is ready
      saveData();
    }
  }, [currentQuestionId, questionsAnswered, uploadedFiles, peopleToRegister, registrationAddress, flowPath, isAuthReady, userId, db, appId]); // Add db and appId to dependency array


  // --- Flow Navigation Logic ---
  // Directly use loadedFlowData from context instead of local flowData state
  const currentQuestion: FlowStep | null | undefined = loadedFlowData ? loadedFlowData.flow.find((q: FlowStep) => q.id === currentQuestionId) : null;

  useEffect(() => {
    if (currentQuestion && currentQuestion.type === "info_block") {
      setCurrentStepDocs(currentQuestion.documents || []);

      setUploadedFiles((prev: UploadedFiles) => {
        const newUploadedFiles: UploadedFiles = { ...prev };
        (currentQuestion.documents || []).forEach((doc: DocumentRequirement) => {
          if (!newUploadedFiles[doc.name]) {
            newUploadedFiles[doc.name] = [];
          }
        });
        return newUploadedFiles;
      });
    } else {
      setCurrentStepDocs([]); // Clear docs if not an info block
    }
  }, [currentQuestionId, currentQuestion, loadedFlowData]); // Depend on loadedFlowData from context

  const handleAnswer = (nextId: string): void => {
    if (!loadedFlowData) return; // Ensure loadedFlowData is loaded
    setQuestionsAnswered(prev => [...prev, currentQuestionId]);

    const nextQuestionObj: FlowStep | undefined = loadedFlowData.flow.find((q: FlowStep) => q.id === nextId);
    if (nextQuestionObj) {
        const stepText = nextQuestionObj.question || nextQuestionObj.text || nextQuestionObj.id;
        setFlowPath(prev => [...prev, { id: nextQuestionObj.id, text: stepText as string }]);
    }
    setCurrentQuestionId(nextId);
  };

  const goBack = (): void => {
    if (questionsAnswered.length > 0) {
      const prevId = questionsAnswered[questionsAnswered.length - 1];
      setQuestionsAnswered(prev => prev.slice(0, -1));
      setCurrentQuestionId(prevId);
      setFlowPath(prev => prev.slice(0, -1)); // Also remove last step from flowPath
    }
  };

  // --- Document Upload and Validation Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docName: string): void => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev: UploadedFiles) => {
      const newFiles: UploadedFiles = { ...prev };
      // If single file expected, clear existing and add new. If multiple, append.
      const docRequirement: DocumentRequirement | undefined = currentStepDocs.find(d => d.name === docName) || orderedAllRequiredDocuments.find(d => d.name === docName);

      if (!newFiles[docName] || !docRequirement?.multiple_files) {
         newFiles[docName] = files.map((file: File) => ({
            file, // Keep the File object in state for FileReader operations
            name: file.name,
            base64: null,
            validation_status: 'pending',
            validation_message: '',
            extracted_data: {}
          } as UploadedFileEntry));
      } else {
          newFiles[docName] = [...newFiles[docName], ...files.map((file: File) => ({
            file,
            name: file.name,
            base64: null,
            validation_status: 'pending',
            validation_message: '',
            extracted_data: {}
          } as UploadedFileEntry))];
      }
      return newFiles;
    });
  };

  const handleValidateDocument = async (docName: string, fileIndex: number): Promise<void> => {
    setLoadingValidation(true);
    const fileToValidate: UploadedFileEntry = uploadedFiles[docName][fileIndex];

    if (!fileToValidate || !fileToValidate.file || !loadedMessages) { // Added !loadedMessages check
      setLoadingValidation(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      if (event.target && typeof event.target.result === 'string') {
        const base64Data = event.target.result.split(',')[1];
        const validationResult = await validateDocumentWithAI(base64Data, docName, loadedMessages); // Pass loadedMessages

        setUploadedFiles((prev: UploadedFiles) => {
          const newFiles: UploadedFiles = { ...prev };
          if (newFiles[docName] && newFiles[docName][fileIndex]) {
            newFiles[docName][fileIndex].validation_status = validationResult.isValid ? 'valid' : 'invalid';
            newFiles[docName][fileIndex].validation_message = validationResult.reason;
            newFiles[docName][fileIndex].extracted_data = validationResult.extractedData || {};
            newFiles[docName][fileIndex].base64 = base64Data; // Store base64 for persistence

            // If it's an identity document and valid, add/update peopleToRegister
            //const docRequirement: DocumentRequirement | undefined = (currentQuestion?.documents || []).find(d => d.name === docName) || loadedFlowData?.flow.flatMap(f => f.documents || []).find(d => f.id === questionsAnswered[questionsAnswered.length-1] && d.name === docName);
            // If it's an identity document and valid, add/update peopleToRegister
            const docRequirementFromFlow: DocumentRequirement | undefined = loadedFlowData?.flow.flatMap(f => f.documents || []).find(d => d.name === docName); // Simplified search
            const currentQDocs = currentQuestion?.documents?.find(d => d.name === docName);
            const finalDocRequirement = currentQDocs || docRequirementFromFlow;

            if (validationResult.isValid && finalDocRequirement && finalDocRequirement.id_extractable) {
              const existingPersonIndex = peopleToRegister.findIndex(p => p.id_number === validationResult.extractedData.id_number);
              if (validationResult.extractedData.name && validationResult.extractedData.id_number) {
                if (existingPersonIndex > -1) {
                  const updatedPeople = [...peopleToRegister];
                  updatedPeople[existingPersonIndex] = { ...updatedPeople[existingPersonIndex], ...(validationResult.extractedData as Person) };
                  setPeopleToRegister(updatedPeople);
                } else {
                  setPeopleToRegister(prevPeople => [...prevPeople, validationResult.extractedData as Person]);
                }
              }
            }
          }
          return newFiles; // Ensure newFiles is returned
        });
        setLoadingValidation(false);
      } else {
        console.error("File could not be read as a base64 string or event.target is null.");
        setUploadedFiles((prev: UploadedFiles) => {
          const newFiles: UploadedFiles = { ...prev };
          if (newFiles[docName] && newFiles[docName][fileIndex]) {
            newFiles[docName][fileIndex].validation_status = 'invalid';
            newFiles[docName][fileIndex].validation_message = loadedMessages.file_read_error; // Use loadedMessages
          }
          return newFiles;
        });
        setLoadingValidation(false);
        // return; // Removed to avoid issues if this path is hit unexpectedly
      }
    };
    reader.onerror = (error: unknown) => {
      console.error("Error reading file:", error instanceof Error ? error.message : String(error));
      setUploadedFiles((prev: UploadedFiles) => {
        const newFiles: UploadedFiles = { ...prev };
        if (newFiles[docName] && newFiles[docName][fileIndex]) {
          newFiles[docName][fileIndex].validation_status = 'invalid';
          newFiles[docName][fileIndex].validation_message = loadedMessages.file_read_error; // Use loadedMessages
        }
        return newFiles;
      });
      setLoadingValidation(false);
    };
    if (fileToValidate.file) { // Ensure file object exists before reading
        reader.readAsDataURL(fileToValidate.file);
    } else {
        // Handle case where file is missing, e.g., set status to invalid
        setUploadedFiles((prev: UploadedFiles) => {
            const newFiles = {...prev};
            if (newFiles[docName] && newFiles[docName][fileIndex]) {
                newFiles[docName][fileIndex].validation_status = 'invalid';
                // Use loadedMessages, ensuring loadedMessages is available or providing a fallback.
                // For simplicity in this specific change, we'll assume loadedMessages is available here,
                // as it's checked at the beginning of handleValidateDocument.
                newFiles[docName][fileIndex].validation_message = loadedMessages!.file_not_found_for_validation;
            }
            return newFiles;
        });
        setLoadingValidation(false);
    }
  };

  const handleRemoveFile = (docName: string, fileIndex: number): void => {
    setUploadedFiles((prev: UploadedFiles) => {
      const newFiles: UploadedFiles = { ...prev };
      if (newFiles[docName]) {
        const removedFile: UploadedFileEntry = newFiles[docName][fileIndex];
        newFiles[docName] = newFiles[docName].filter((_, i) => i !== fileIndex);

        // Remove person if their ID document was removed and they were the only source
        if (removedFile.extracted_data && removedFile.extracted_data.id_number) {
          const isIdSourceUnique = Object.values(newFiles).every((filesArray: UploadedFileEntry[]) =>
            filesArray.every((f: UploadedFileEntry) => f && f.extracted_data && f.extracted_data.id_number !== removedFile.extracted_data.id_number)
          );
          if (isIdSourceUnique) {
            setPeopleToRegister((prevPeople: Person[]) =>
              prevPeople.filter(p => p.id_number !== removedFile.extracted_data.id_number)
            );
          }
        }
      }
      return newFiles;
    });
  };

  const isCurrentStepRequiredDocumentsValidated = (): boolean => {
    if (!currentQuestion || !currentQuestion.documents) return true;

    for (const docRequirement of currentQuestion.documents) {
        const uploaded = uploadedFiles[docRequirement.name];
        if (!uploaded || uploaded.length === 0) return false;
        if (uploaded.some((f: UploadedFileEntry) => f.validation_status !== 'valid')) return false;
    }
    return true;
  };

  const handleContinueWithValidation = (): void => {
    if (isCurrentStepRequiredDocumentsValidated()) {
      if (currentContent && currentContent.next_question_id) { // currentContent might be null
        handleAnswer(currentContent.next_question_id);
      } else if (currentQuestion && currentQuestion.next_question_id) { // fallback to currentQuestion if currentContent is null but currentQuestion is not
        handleAnswer(currentQuestion.next_question_id);
      }
    } else {
      // You might want a custom modal here instead of alert for better UX
      if (loadedMessages) { // Check if loadedMessages is available
        alert(loadedMessages.alert_all_required_docs_needed);
      }
    }
  };

  const handleContinueWithoutValidationClick = (): void => {
    if (currentContent && currentContent.next_question_id) {
      setNextIdAfterConfirmation(currentContent.next_question_id);
      setShowConfirmationModal(true);
    }
  };

  const handleConfirmContinue = (): void => {
    setShowConfirmationModal(false);
    if (nextIdAfterConfirmation) {
      handleAnswer(nextIdAfterConfirmation);
      setNextIdAfterConfirmation(null); // Clear the ID
    }
  };

  const handleCancelContinue = (): void => {
    setShowConfirmationModal(false);
    setNextIdAfterConfirmation(null); // Clear the ID
  };

  const proceedToSummary = (): void => {
    if (!loadedFlowData) return; // Ensure loadedFlowData is loaded
    setCurrentQuestionId("summary_screen");
    const summaryScreen = loadedFlowData.flow.find((q: FlowStep) => q.id === "summary_screen");
    if (summaryScreen && loadedMessages) { // Check if loadedMessages is available
        setFlowPath(prev => [...prev, { id: summaryScreen.id, text: loadedMessages.summary_title }]);
    }
  };

  const handleRemovePerson = (idNumber: string): void => {
    setPeopleToRegister((prev: Person[]) => prev.filter((p: Person) => p.id_number !== idNumber));
  };

  const handleAddressEditToggle = (): void => {
    if (!showAddressEdit) {
      setTempAddress(registrationAddress);
    }
    setShowAddressEdit(!showAddressEdit);
  };

  const handleAddressSave = (): void => {
    setRegistrationAddress(tempAddress);
    setShowAddressEdit(false);
  };

  const currentContent: FlowStep | null | undefined = currentQuestion;

  const handleSendAll = async (): Promise<void> => {
    setSendingData(true);
    setApiResponseMessage("");

    // Prepare data for API call
    const dataToSend = {
      userId: userId,
      registrationAddress: registrationAddress,
      people: peopleToRegister,
      documents: Object.keys(uploadedFiles).reduce((acc, docName) => {
        acc[docName] = uploadedFiles[docName].map((fileEntry: UploadedFileEntry) => ({
          name: fileEntry.name,
          validation_status: fileEntry.validation_status,
          validation_message: fileEntry.validation_message, // ADDED
          extracted_data: fileEntry.extracted_data,
          base64: fileEntry.base64 // Include base64 data for submission
        }));
        return acc;
      }, {} as { [key: string]: Array<Omit<UploadedFileEntry, 'file'>> }),
      flowPath: flowPath
    };

    console.log("Simulating API send with data:", dataToSend);

    // Simulate an API call
    try {
      // Replace with actual fetch to your backend API endpoint
      // const response = await fetch('/api/submit-padron', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(dataToSend),
      // });

      // Simulate a delay and a random success/failure for demonstration
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      const success = Math.random() > 0.3; // 70% chance of success

      if (success) {
        setApiResponseMessage(loadedMessages.send_success_message); // Use loadedMessages
      } else {
        setApiResponseMessage(loadedMessages.send_error_message); // Use loadedMessages
      }
    } catch (error: unknown) {
      console.error("API Error:", error instanceof Error ? error.message : String(error));
      setApiResponseMessage(loadedMessages.send_error_message); // Use loadedMessages
    } finally {
      setSendingData(false);
    }
  };


  const orderedAllRequiredDocuments = useMemo((): DocumentRequirement[] => {
    if (!loadedFlowData) return [];
    const allDocs: { [key: string]: DocumentRequirement } = {};
    questionsAnswered.forEach((qId: string) => {
        const q: FlowStep | undefined = loadedFlowData.flow.find((f: FlowStep) => f.id === qId);
        if (q && q.type === "info_block" && q.documents) {
            q.documents.forEach((docReq: DocumentRequirement) => {
                allDocs[docReq.name] = docReq;
            });
        }
    });
    // currentContent is derived from currentQuestion which itself depends on loadedFlowData
    const currentQ = loadedFlowData.flow.find((f: FlowStep) => f.id === currentQuestionId);
    if (currentQ && currentQ.type === "info_block" && currentQ.documents) {
        currentQ.documents.forEach((docReq: DocumentRequirement) => {
            allDocs[docReq.name] = docReq;
        });
    }
    return Object.values(allDocs);
  }, [loadedFlowData, questionsAnswered, currentQuestionId]);

  // Updated loading condition to use isLanguageLoading and ensure loadedMessages & loadedFlowData are available.
  // currentContent depends on loadedFlowData so it's implicitly covered.
  if (!isAuthReady || isLanguageLoading || !loadedMessages || !loadedFlowData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-center text-gray-700">
          <p className="text-lg">{loadedMessages ? loadedMessages.loading_app : "Loading application..."}</p>
          <p className="text-sm">{loadedMessages ? loadedMessages.loading_fallback_message : "If it takes time, please reload."}</p>
        </div>
      </div>
    );
  }

  if (!isLanguageSelected) {
    return <LanguageSelectionScreen onLanguageSelected={handleLanguageSelected} messages={loadedMessages} />;
  }

  // After the loading check, currentContent should be derivable if loadedFlowData is present.
  // However, to be absolutely safe, especially if there's a brief moment currentQuestionId might not match anything in newly loaded flow:
  const safeCurrentContent = loadedFlowData.flow.find((q: FlowStep) => q.id === currentQuestionId) || null;

  if (!safeCurrentContent) {
    // This case should ideally not be reached if flow data is consistent and currentQuestionId is valid.
    // Could be a sign of an issue or a very brief transitional state.
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="text-center text-gray-700">
                <p className="text-lg">{loadedMessages.loading_app}</p>
                <p className="text-sm">Preparing content...</p>
            </div>
        </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-6 flex flex-col items-center font-sans">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl mt-8">
        <h1 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">{loadedMessages.app_title}</h1>
        <p className="text-center text-gray-600 mb-8">{loadedMessages.app_subtitle}</p>

        <Breadcrumbs flowPath={flowPath} />

        {currentQuestionId === "summary_screen" ? (
          <SummaryScreen
            registrationAddress={registrationAddress}
            peopleToRegister={peopleToRegister}
            showAddressEdit={showAddressEdit}
            tempAddress={tempAddress}
            setTempAddress={setTempAddress}
            handleAddressSave={handleAddressSave}
            handleAddressEditToggle={handleAddressEditToggle}
            handleRemovePerson={handleRemovePerson}
            apiResponseMessage={apiResponseMessage}
            handleSendAll={handleSendAll}
            sendingData={sendingData}
            goBack={goBack}
            messages={loadedMessages} // Use loadedMessages
            userId={userId}
          />
        ) : currentQuestionId === "final_document_review" ? (
          <FinalDocumentReviewScreen
            orderedAllRequiredDocuments={orderedAllRequiredDocuments}
            uploadedFiles={uploadedFiles}
            handleValidateDocument={handleValidateDocument}
            handleRemoveFile={handleRemoveFile}
            loadingValidation={loadingValidation}
            proceedToSummary={proceedToSummary}
            fileInputRefs={fileInputRefs}
            messages={loadedMessages} // Use loadedMessages
          />
        ) : (
          currentContent && // Ensure currentContent is available
          <QuestionnaireScreen
            currentContent={currentContent}
            handleAnswer={handleAnswer}
            uploadedFiles={uploadedFiles}
            handleFileChange={handleFileChange}
            handleValidateDocument={handleValidateDocument}
            handleRemoveFile={handleRemoveFile}
            loadingValidation={loadingValidation}
            isCurrentStepRequiredDocumentsValidated={isCurrentStepRequiredDocumentsValidated}
            handleContinueWithValidation={handleContinueWithValidation}
            handleContinueWithoutValidationClick={handleContinueWithoutValidationClick}
            fileInputRefs={fileInputRefs}
            messages={loadedMessages} // Use loadedMessages
            orderedAllRequiredDocuments={orderedAllRequiredDocuments} // Pass this prop
          />
        )}
        {currentQuestionId !== "summary_screen" && questionsAnswered.length > 0 && (
            <div className="flex justify-between mt-8">
                 <button
                    onClick={goBack}
                    className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors font-semibold"
                  >
                    {loadedMessages.back_button}
                  </button>
            </div>
        )}
      </div>

      <ConfirmationModal
        showModal={showConfirmationModal}
        title={loadedMessages.confirm_no_validation_title} // Use loadedMessages
        message={loadedMessages.confirm_no_validation_message} // Use loadedMessages
        onConfirm={handleConfirmContinue}
        onCancel={handleCancelContinue}
        yesButtonText={loadedMessages.confirm_no_validation_yes_button} // Use loadedMessages
        noButtonText={loadedMessages.confirm_no_validation_no_button} // Use loadedMessages
      />

      <p className="text-xs text-gray-500 mt-4">{loadedMessages.user_id_label} {userId || (loadedMessages ? loadedMessages.loading_app : "...")}</p>
    </div>
  );
}

export default App;
