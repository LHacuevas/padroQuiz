import React, { useState, useEffect, useRef, useMemo } from 'react'; // Added useMemo to main React import
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Upload, XCircle, CheckCircle, Trash2, Home, User, FileText, CheckSquare, Settings, Send } from 'lucide-react'; // Icons
import { db, auth, initialAuthToken, aId as appId, firebaseApp } from './src/firebaseConfig';
import messages from './src/locales/es.json';
import rawFlowDataJson from './src/data/flowData.es.json';
// Import new components
import Breadcrumbs from './src/components/Breadcrumbs';
import ConfirmationModal from './src/components/ConfirmationModal';
import QuestionnaireScreen from './src/components/QuestionnaireScreen';
import FinalDocumentReviewScreen from './src/components/FinalDocumentReviewScreen';
import SummaryScreen from './src/components/SummaryScreen';
// Import necessary types/interfaces
import { FlowStep, UploadedFiles, Person, FlowPathEntry, FlowData, DocumentRequirement } from './src/interfaces';


// --- AI Document Validation Function ---
async function validateDocumentWithAI(base64Image, documentType) {
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

  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      const jsonText = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(jsonText);
      return parsedJson;
    } else {
      return { isValid: false, reason: messages.ai_response_error, extractedData: {} };
    }
  } catch (error) {
    console.error("Error al llamar a la API de Gemini:", error);
    return { isValid: false, reason: `${messages.ai_connection_error} ${error.message}`, extractedData: {} };
  }
}

// --- Main App Component ---
function App() {
  const [flowData, setFlowData] = useState<FlowData | null>(null); // State for processed flowData
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
  const [flowPath, setFlowPath] = useState<FlowPathEntry[]>([{ id: "start", text: messages.breadcrumb_home }]);

  useEffect(() => {
    if (rawFlowDataJson && messages) {
      const processedFlow = rawFlowDataJson.flow.map(item => {
        if (item.id === "final_document_review" && item.text === "final_document_review_instructions_key") {
          return { ...item, text: messages.final_document_review_instructions };
        }
        // Potential place for more comprehensive i18n processing of questions/descriptions if needed
        return item;
      });
      setFlowData({ flow: processedFlow });
    }
  }, [rawFlowDataJson, messages]);


  // --- Firebase Integration ---
  useEffect(() => {
    if (!auth || !db) {
      console.error("Firebase auth or db is not initialized. Check firebaseConfig.ts.");
      setIsAuthReady(true); // Allow app to proceed, but Firebase features might not work
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
          setFlowPath(savedData.flowPath || [{ id: "start", text: messages.breadcrumb_home }]);
        }
        setIsAuthReady(true);
      } else {
        if (initialAuthToken) {
          try {
            await signInWithCustomToken(auth, initialAuthToken);
            // Assuming onAuthStateChanged will be triggered again with the new user
          } catch (error) {
            console.error("Error signing in with custom token:", error);
            // Fallback to anonymous sign-in if custom token fails
            try {
              const anonUser = await signInAnonymously(auth);
              setUserId(anonUser.user.uid);
            } catch (anonError) {
              console.error("Error signing in anonymously after custom token failure:", anonError);
            }
            setIsAuthReady(true);
          }
        } else {
          try {
            const anonUser = await signInAnonymously(auth);
            setUserId(anonUser.user.uid);
          } catch (anonError) {
            console.error("Error signing in anonymously:", anonError);
          }
          setIsAuthReady(true);
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db, appId, initialAuthToken]); // Add auth, db, appId, initialAuthToken to dependency array

  // Save data to Firestore whenever relevant state changes
  useEffect(() => {
    const saveData = async () => {
      if (isAuthReady && userId && db && appId) { // Ensure db and appId are available
        try {
          const filesToSave = {};
          for (const docName in uploadedFiles) {
            filesToSave[docName] = uploadedFiles[docName].map(fileEntry => {
              const { file, ...rest } = fileEntry; // Destructure to omit 'file' object
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
        } catch (e) {
          console.error("Error saving document: ", e);
        }
      }
    };
    if (isAuthReady) { // Only save after auth is ready
      saveData();
    }
  }, [currentQuestionId, questionsAnswered, uploadedFiles, peopleToRegister, registrationAddress, flowPath, isAuthReady, userId, db, appId]); // Add db and appId to dependency array


  // --- Flow Navigation Logic ---
  const currentQuestion = flowData ? flowData.flow.find(q => q.id === currentQuestionId) : null;

  useEffect(() => {
    if (currentQuestion && currentQuestion.type === "info_block") {
      setCurrentStepDocs(currentQuestion.documents || []);

      setUploadedFiles(prev => {
        const newUploadedFiles = { ...prev };
        (currentQuestion.documents || []).forEach(doc => {
          if (!newUploadedFiles[doc.name]) {
            newUploadedFiles[doc.name] = [];
          }
        });
        return newUploadedFiles;
      });
    } else {
      setCurrentStepDocs([]); // Clear docs if not an info block
    }
  }, [currentQuestionId, currentQuestion]); // currentQuestion will change when flowData changes

  const handleAnswer = (nextId) => {
    if (!flowData) return; // Ensure flowData is loaded
    setQuestionsAnswered(prev => [...prev, currentQuestionId]);

    // Update flowPath for breadcrumbs
    const nextQuestionObj = flowData.flow.find(q => q.id === nextId);
    if (nextQuestionObj) {
        const stepText = nextQuestionObj.question || nextQuestionObj.text || nextQuestionObj.id;
        setFlowPath(prev => [...prev, { id: nextQuestionObj.id, text: stepText }]);
    }
    setCurrentQuestionId(nextId);
  };

  const goBack = () => {
    if (questionsAnswered.length > 0) {
      const prevId = questionsAnswered[questionsAnswered.length - 1];
      setQuestionsAnswered(prev => prev.slice(0, -1));
      setCurrentQuestionId(prevId);
      setFlowPath(prev => prev.slice(0, -1)); // Also remove last step from flowPath
    }
  };

  // --- Document Upload and Validation Logic ---
  const handleFileChange = (e, docName) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      // If single file expected, clear existing and add new. If multiple, append.
      const docRequirement = currentStepDocs.find(d => d.name === docName) || orderedAllRequiredDocuments.find(d => d.name === docName);

      if (!newFiles[docName] || !docRequirement?.multiple_files) {
         newFiles[docName] = files.map(file => ({
            file, // Keep the File object in state for FileReader operations
            name: file.name,
            base64: null, // Will be populated after reading
            validation_status: 'pending',
            validation_message: '',
            extracted_data: {}
          }));
      } else {
          newFiles[docName] = [...newFiles[docName], ...files.map(file => ({
            file,
            name: file.name,
            base64: null,
            validation_status: 'pending',
            validation_message: '',
            extracted_data: {}
          }))];
      }
      return newFiles;
    });
  };

  const handleValidateDocument = async (docName, fileIndex) => {
    setLoadingValidation(true);
    const fileToValidate = uploadedFiles[docName][fileIndex];

    if (!fileToValidate || !fileToValidate.file) {
      setLoadingValidation(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result.split(',')[1]; // Get base64 string without prefix
      const validationResult = await validateDocumentWithAI(base64Data, docName);

      setUploadedFiles(prev => {
        const newFiles = { ...prev };
        if (newFiles[docName] && newFiles[docName][fileIndex]) {
          newFiles[docName][fileIndex].validation_status = validationResult.isValid ? 'valid' : 'invalid';
          newFiles[docName][fileIndex].validation_message = validationResult.reason;
          newFiles[docName][fileIndex].extracted_data = validationResult.extractedData || {};
          newFiles[docName][fileIndex].base64 = base64Data; // Store base64 for persistence

          // If it's an identity document and valid, add/update peopleToRegister
          const docRequirement = (currentQuestion.documents || []).find(d => d.name === docName) || flowData.flow.flatMap(f => f.documents || []).find(d => f.id === questionsAnswered[questionsAnswered.length-1] && d.name === docName); // Find the original doc requirement to check id_extractable
          if (validationResult.isValid && docRequirement && docRequirement.id_extractable) {
            const existingPersonIndex = peopleToRegister.findIndex(p => p.id_number === validationResult.extractedData.id_number);
            if (validationResult.extractedData.name && validationResult.extractedData.id_number) {
              if (existingPersonIndex > -1) {
                // Update existing person
                const updatedPeople = [...peopleToRegister];
                updatedPeople[existingPersonIndex] = { ...updatedPeople[existingPersonIndex], ...validationResult.extractedData };
                setPeopleToRegister(updatedPeople);
              } else {
                // Add new person
                setPeopleToRegister(prevPeople => [...prevPeople, validationResult.extractedData]);
              }
            }
          }
        }
        return newFiles;
      });
      setLoadingValidation(false);
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      setUploadedFiles(prev => {
        const newFiles = { ...prev };
        if (newFiles[docName] && newFiles[docName][fileIndex]) {
          newFiles[docName][fileIndex].validation_status = 'invalid';
          newFiles[docName][fileIndex].validation_message = messages.file_read_error;
        }
        return newFiles;
      });
      setLoadingValidation(false);
    };
    reader.readAsDataURL(fileToValidate.file);
  };

  const handleRemoveFile = (docName, fileIndex) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      if (newFiles[docName]) {
        const removedFile = newFiles[docName][fileIndex];
        newFiles[docName] = newFiles[docName].filter((_, i) => i !== fileIndex);

        // Remove person if their ID document was removed and they were the only source
        if (removedFile.extracted_data && removedFile.extracted_data.id_number) {
          const isIdSourceUnique = Object.values(newFiles).every(filesArray =>
            filesArray.every(f => f && f.extracted_data && f.extracted_data.id_number !== removedFile.extracted_data.id_number)
          );
          if (isIdSourceUnique) {
            setPeopleToRegister(prevPeople =>
              prevPeople.filter(p => p.id_number !== removedFile.extracted_data.id_number)
            );
          }
        }
      }
      return newFiles;
    });
  };

  const isCurrentStepRequiredDocumentsValidated = () => {
    if (!currentQuestion || !currentQuestion.documents) return true; // If no documents or not an info_block, consider it valid to proceed

    for (const docRequirement of currentQuestion.documents) {
        const uploaded = uploadedFiles[docRequirement.name];
        if (!uploaded || uploaded.length === 0) return false;
        if (uploaded.some(f => f.validation_status !== 'valid')) return false;
    }
    return true;
  };

  const handleContinueWithValidation = () => {
    if (isCurrentStepRequiredDocumentsValidated()) {
      handleAnswer(currentContent.next_question_id);
    } else {
      // You might want a custom modal here instead of alert for better UX
      alert(messages.alert_all_required_docs_needed);
    }
  };

  const handleContinueWithoutValidationClick = () => {
    setNextIdAfterConfirmation(currentContent.next_question_id);
    setShowConfirmationModal(true);
  };

  const handleConfirmContinue = () => {
    setShowConfirmationModal(false);
    if (nextIdAfterConfirmation) {
      handleAnswer(nextIdAfterConfirmation);
      setNextIdAfterConfirmation(null); // Clear the ID
    }
  };

  const handleCancelContinue = () => {
    setShowConfirmationModal(false);
    setNextIdAfterConfirmation(null); // Clear the ID
  };

  const proceedToSummary = () => {
    if (!flowData) return; // Ensure flowData is loaded
    // This function is now only called from the 'final_document_review' block
    setCurrentQuestionId("summary_screen");
    // Add the summary screen to the flowPath
    const summaryScreen = flowData.flow.find(q => q.id === "summary_screen");
    if (summaryScreen) {
        setFlowPath(prev => [...prev, { id: summaryScreen.id, text: messages.summary_title }]);
    }
  };

  const handleRemovePerson = (idNumber) => {
    setPeopleToRegister(prev => prev.filter(p => p.id_number !== idNumber));
  };

  const handleAddressEditToggle = () => {
    if (!showAddressEdit) {
      setTempAddress(registrationAddress);
    }
    setShowAddressEdit(!showAddressEdit);
  };

  const handleAddressSave = () => {
    setRegistrationAddress(tempAddress);
    setShowAddressEdit(false);
  };

  const currentContent = currentQuestion; // currentQuestion is already potentially null if flowData is null

  const handleSendAll = async () => {
    setSendingData(true);
    setApiResponseMessage("");

    // Prepare data for API call
    const dataToSend = {
      userId: userId,
      registrationAddress: registrationAddress,
      people: peopleToRegister,
      documents: Object.keys(uploadedFiles).reduce((acc, docName) => {
        acc[docName] = uploadedFiles[docName].map(fileEntry => ({
          name: fileEntry.name,
          validation_status: fileEntry.validation_status,
          extracted_data: fileEntry.extracted_data,
          base64: fileEntry.base64 // Include base64 data for submission
        }));
        return acc;
      }, {}),
      flowPath: flowPath // Include the complete flow path
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
        setApiResponseMessage(messages.send_success_message);
      } else {
        setApiResponseMessage(messages.send_error_message);
      }
    } catch (error) {
      console.error("API Error:", error);
      setApiResponseMessage(messages.send_error_message);
    } finally {
      setSendingData(false);
    }
  };


  const orderedAllRequiredDocuments = useMemo((): DocumentRequirement[] => {
    if (!flowData || !currentContent) return []; // Handle null flowData or currentContent
    const allDocs: {[key: string]: DocumentRequirement} = {};
    questionsAnswered.forEach(qId => {
        const q = flowData.flow.find(f => f.id === qId);
        if (q && q.type === "info_block" && q.documents) {
            q.documents.forEach(docReq => {
                allDocs[docReq.name] = docReq;
            });
        }
    });
    // Also add documents from the current step if it's an info_block and currentContent is available
    if (currentContent && currentContent.type === "info_block" && currentContent.documents) {
        currentContent.documents.forEach(docReq => {
            allDocs[docReq.name] = docReq;
        });
    }
    return Object.values(allDocs);
  }, [flowData, questionsAnswered, currentContent]);

  if (!currentContent || !flowData || !messages) { // Added !messages check for safety
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-center text-gray-700">
          <p className="text-lg">{messages ? messages.loading_app : "Loading application..."}</p>
          <p className="text-sm">{messages ? messages.loading_fallback_message : "If it takes time, please reload."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-6 flex flex-col items-center font-sans">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl mt-8">
        <h1 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">{messages.app_title}</h1>
        <p className="text-center text-gray-600 mb-8">{messages.app_subtitle}</p>

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
            messages={messages}
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
            messages={messages}
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
            messages={messages}
            orderedAllRequiredDocuments={orderedAllRequiredDocuments} // Pass this prop
          />
        )}
        {currentQuestionId !== "summary_screen" && questionsAnswered.length > 0 && (
            <div className="flex justify-between mt-8">
                 <button
                    onClick={goBack}
                    className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors font-semibold"
                  >
                    {messages.back_button}
                  </button>
            </div>
        )}
      </div>

      <ConfirmationModal
        showModal={showConfirmationModal}
        title={messages.confirm_no_validation_title}
        message={messages.confirm_no_validation_message}
        onConfirm={handleConfirmContinue}
        onCancel={handleCancelContinue}
        yesButtonText={messages.confirm_no_validation_yes_button}
        noButtonText={messages.confirm_no_validation_no_button}
      />

      <p className="text-xs text-gray-500 mt-4">{messages.user_id_label} {userId || (messages ? messages.loading_app : "...")}</p>
    </div>
  );
}

export default App;
