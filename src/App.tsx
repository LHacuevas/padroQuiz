import React, { useState, useEffect, useRef, useMemo } from 'react';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, initialAuthToken, aId as appId } from './firebaseConfig';
import { useLanguage } from './contexts/LanguageContext';
import Breadcrumbs from './components/Breadcrumbs';
import ConfirmationModal from './components/ConfirmationModal';
import QuestionnaireScreen from './components/QuestionnaireScreen';
import FinalDocumentReviewScreen from './components/FinalDocumentReviewScreen';
import SummaryScreen from './components/SummaryScreen';
import LanguageSelectionScreen from './components/LanguageSelectionScreen';
import AttributesModal from './components/AttributesModal';
import { processAndValidateFile, getAIProcedureSummary, type AIProcedureSummary } from './components/FileProcessor'; // Import AIProcedureSummary
import type { FlowStep, UploadedFiles, Person, FlowPathEntry, FlowData, DocumentRequirement, UploadedFileEntry, Messages } from './interfaces';

function App() {
  const {
    currentLang,
    loadedMessages,
    loadedFlowData,
    isLoading: isLanguageLoading
  } = useLanguage();

  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>("q1_action_type");
  const [questionsAnswered, setQuestionsAnswered] = useState<string[]>([]);
  const [currentStepDocs, setCurrentStepDocs] = useState<DocumentRequirement[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({});
  const [loadingValidation, setLoadingValidation] = useState<boolean>(false);
  const [peopleToRegister, setPeopleToRegister] = useState<Person[]>([]);
  const [registrationAddress, setRegistrationAddress] = useState<string>("Dirección de empadronamiento");
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddressEdit, setShowAddressEdit] = useState<boolean>(false);
  const [tempAddress, setTempAddress] = useState<string>("");
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [nextIdAfterConfirmation, setNextIdAfterConfirmation] = useState<string | null>(null);
  const [sendingData, setSendingData] = useState<boolean>(false);
  const [apiResponseMessage, setApiResponseMessage] = useState<string>("");
  const [flowPath, setFlowPath] = useState<FlowPathEntry[]>([{ id: "start", text: "Inicio" }]);
  const [showAttributesModal, setShowAttributesModal] = useState<boolean>(false);
  const [currentAttributesData, setCurrentAttributesData] = useState<Record<string, any> | null>(null);
  const [selectedProcedureType, setSelectedProcedureType] = useState<string>("");

  // State for AI Procedure Summary
  const [aiSummaryData, setAiSummaryData] = useState<AIProcedureSummary | null>(null);
  const [isAISummaryLoading, setIsAISummaryLoading] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

  const compileAllExtractedDataToJson = (): string => {
    const allExtractedData: Record<string, any> = {};
    Object.entries(uploadedFiles).forEach(([docName, fileEntries]) => {
      fileEntries.forEach((entry, index) => {
        if (entry.extracted_data && Object.keys(entry.extracted_data).length > 0) {
          allExtractedData[`${docName}_${index}`] = entry.extracted_data;
        }
      });
    });
    return JSON.stringify(allExtractedData, null, 2);
  };

  const handleGenerateAISummary = async () => {
    if (!loadedMessages) return;
    setIsAISummaryLoading(true);
    setAiSummaryError(null);
    setAiSummaryData(null);
    const extractedJson = compileAllExtractedDataToJson();
    try {
      const summary = await getAIProcedureSummary(selectedProcedureType, extractedJson, loadedMessages);
      setAiSummaryData(summary);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setAiSummaryError(error instanceof Error ? error.message : String(error));
      setAiSummaryData(null);
    } finally {
      setIsAISummaryLoading(false);
    }
  };

  const handleShowAttributesModal = (data: Record<string, any>) => {
    setCurrentAttributesData(data);
    setShowAttributesModal(true);
  };

  const handleApplyAISuggestions = (
    suggestedAddress?: string,
    suggestedPeople?: Person[]
  ) => {
    if (suggestedAddress) {
      setRegistrationAddress(suggestedAddress);
    }
    if (suggestedPeople && suggestedPeople.length > 0) {
      // Replace peopleToRegister or merge? For now, let's replace.
      // Consider if IDs are stable or if this should be a merge based on some logic.
      // For this implementation, a direct replacement is simpler.
      setPeopleToRegister(suggestedPeople);
    }
    // Clear the AI summary data after applying to remove the suggestion from UI or change its state
    setAiSummaryData(null);
    setAiSummaryError(null);
    // Optionally, set a message like "AI suggestions have been applied"
  };

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
      if (currentQuestionId !== "start" && !questionsAnswered.includes(currentQuestionId)) {
         const currentStepDetails = loadedFlowData.flow.find(q => q.id === currentQuestionId);
         if (currentStepDetails) {
            const currentStepText = currentStepDetails.question || currentStepDetails.text || currentStepDetails.id;
            if (newFlowPath.length === 0 || newFlowPath[newFlowPath.length -1].id !== currentQuestionId) {
                 newFlowPath.push({id: currentQuestionId, text: currentStepText as string});
            }
         }
      }
      setFlowPath(newFlowPath);
    }
  }, [currentLang, loadedMessages, loadedFlowData, questionsAnswered, currentQuestionId]);

  useEffect(() => {
    if (!auth || !db) {
      console.error("Firebase auth or db is not initialized. Check firebaseConfig.ts.");
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        setUserId(user.uid);
        const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/padron_data/user_progress`);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const savedData = docSnap.data();
          setCurrentQuestionId(savedData.currentQuestionId || "q1_action_type");
          setQuestionsAnswered(savedData.questionsAnswered || []);
          setUploadedFiles(savedData.uploadedFiles || {});
          setPeopleToRegister(savedData.peopleToRegister || []);
          setRegistrationAddress(savedData.registrationAddress || "Dirección de empadronamiento");
          setSelectedProcedureType(savedData.selectedProcedureType || "");
          const savedFlowPathIds = (savedData.flowPath || []).map((entry: FlowPathEntry) => entry.id);
          if (!(savedFlowPathIds.length > 0 && savedData.flowPath[0].id === "start") && loadedMessages) {
            setFlowPath([{ id: "start", text: loadedMessages.breadcrumb_home }]);
          } else if (!(savedFlowPathIds.length > 0 && savedData.flowPath[0].id === "start")) {
            setFlowPath([{ id: "start", text: "Inicio" }]);
          }
        } else if (loadedMessages) {
            setFlowPath([{ id: "start", text: loadedMessages.breadcrumb_home }]);
            setSelectedProcedureType("");
        }
        setIsAuthReady(true);
      } else {
        if (initialAuthToken) {
          try {
            await signInWithCustomToken(auth, initialAuthToken);
          } catch (error: unknown) {
            console.error("Error signing in with custom token:", error instanceof Error ? error.message : String(error));
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
  }, [auth, db, appId, initialAuthToken, loadedMessages]);

  useEffect(() => {
    const saveData = async () => {
      if (isAuthReady && userId && db && appId) {
        try {
          const filesToSave: { [key: string]: Partial<Omit<UploadedFileEntry, 'file'>>[] } = {};
          for (const docName in uploadedFiles) {
            filesToSave[docName] = uploadedFiles[docName].map((fileEntry: UploadedFileEntry) => {
              const { file: _unusedFile, ...rest } = fileEntry;
              return rest;
            });
          }
          const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/padron_data/user_progress`);
          await setDoc(userDocRef, {
            currentQuestionId,
            questionsAnswered,
            uploadedFiles: filesToSave,
            peopleToRegister,
            registrationAddress,
            flowPath,
            selectedProcedureType
          }, { merge: true });
          console.log("Data saved to Firestore.");
        } catch (e: unknown) {
          console.error("Error saving document: ", e instanceof Error ? e.message : String(e));
        }
      }
    };
    if (isAuthReady) {
      saveData();
    }
  }, [currentQuestionId, questionsAnswered, uploadedFiles, peopleToRegister, registrationAddress, flowPath, selectedProcedureType, isAuthReady, userId, db, appId]);

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
      setCurrentStepDocs([]);
    }
  }, [currentQuestionId, currentQuestion, loadedFlowData]);

  const handleAnswer = (nextId: string): void => {
    if (!loadedFlowData) return;
    if (currentQuestionId === "q1_action_type" && currentQuestion && currentQuestion.options) {
      const selectedOption = currentQuestion.options.find(opt => opt.next_question_id === nextId);
      if (selectedOption) {
        setSelectedProcedureType(selectedOption.text);
      }
    }
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
      setFlowPath(prev => prev.slice(0, -1));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docName: string): void => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev: UploadedFiles) => {
      const newFiles: UploadedFiles = { ...prev };
      const docRequirement: DocumentRequirement | undefined = currentStepDocs.find(d => d.name === docName) || orderedAllRequiredDocuments.find(d => d.name === docName);
      if (!newFiles[docName] || !docRequirement?.multiple_files) {
         newFiles[docName] = files.map((file: File) => ({
            file, name: file.name, base64: null, validation_status: 'pending', validation_message: '', extracted_data: {}
          } as UploadedFileEntry));
      } else {
          newFiles[docName] = [...newFiles[docName], ...files.map((file: File) => ({
            file, name: file.name, base64: null, validation_status: 'pending', validation_message: '', extracted_data: {}
          } as UploadedFileEntry))];
      }
      return newFiles;
    });
  };

  const handleValidateDocument = async (docName: string, fileIndex: number): Promise<void> => {
    setLoadingValidation(true);
    const fileToValidate: UploadedFileEntry = uploadedFiles[docName][fileIndex];
    if (!fileToValidate || !fileToValidate.file || !loadedMessages) {
      setLoadingValidation(false);
      return;
    }
    processAndValidateFile(fileToValidate.file, docName, loadedMessages)
      .then(validationResult => {
        setUploadedFiles((prev: UploadedFiles) => {
          const newFiles: UploadedFiles = { ...prev };
          if (newFiles[docName] && newFiles[docName][fileIndex]) {
            newFiles[docName][fileIndex].validation_status = validationResult.isValid ? 'valid' : 'invalid';
            newFiles[docName][fileIndex].validation_message = validationResult.reason;
            newFiles[docName][fileIndex].extracted_data = validationResult.extractedData || {};
            if (validationResult.base64) {
              newFiles[docName][fileIndex].base64 = validationResult.base64;
            }
            const docRequirementFromFlow: DocumentRequirement | undefined = loadedFlowData?.flow.flatMap(f => f.documents || []).find(d => d.name === docName);
            const currentQDocs = currentQuestion?.documents?.find(d => d.name === docName);
            const finalDocRequirement = currentQDocs || docRequirementFromFlow;
            if (validationResult.isValid && finalDocRequirement && finalDocRequirement.id_extractable) {
              const { name, id_number } = validationResult.extractedData;
              if (name && id_number) {
                const existingPersonIndex = peopleToRegister.findIndex(p => p.id_number === id_number);
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
          return newFiles;
        });
      })
      .catch(error => {
        console.error("Error processing or validating file:", error);
        setUploadedFiles((prev: UploadedFiles) => {
          const newFiles: UploadedFiles = { ...prev };
          if (newFiles[docName] && newFiles[docName][fileIndex]) {
            newFiles[docName][fileIndex].validation_status = 'invalid';
            newFiles[docName][fileIndex].validation_message = error.reason || (loadedMessages ? loadedMessages.file_read_error : "File read error") || "Unknown error during validation";
          }
          return newFiles;
        });
      })
      .finally(() => {
        setLoadingValidation(false);
      });
  };

  const handleRemoveFile = (docName: string, fileIndex: number): void => {
    setUploadedFiles((prev: UploadedFiles) => {
      const newFiles: UploadedFiles = { ...prev };
      if (newFiles[docName]) {
        const removedFile: UploadedFileEntry = newFiles[docName][fileIndex];
        newFiles[docName] = newFiles[docName].filter((_, i) => i !== fileIndex);
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
      if (currentContent && currentContent.next_question_id) {
        handleAnswer(currentContent.next_question_id);
      } else if (currentQuestion && currentQuestion.next_question_id) {
        handleAnswer(currentQuestion.next_question_id);
      }
    } else {
      if (loadedMessages) {
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
      setNextIdAfterConfirmation(null);
    }
  };

  const handleCancelContinue = (): void => {
    setShowConfirmationModal(false);
    setNextIdAfterConfirmation(null);
  };

  const proceedToSummary = (): void => {
    if (!loadedFlowData || !loadedMessages) return;
    setCurrentQuestionId("summary_screen");
    const summaryScreen = loadedFlowData.flow.find((q: FlowStep) => q.id === "summary_screen");
    if (summaryScreen) { // text for summary is empty, use messages.summary_title
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
    const dataToSend = {
      userId: userId,
      registrationAddress: registrationAddress,
      people: peopleToRegister,
      documents: Object.keys(uploadedFiles).reduce((acc, docName) => {
        acc[docName] = uploadedFiles[docName].map((fileEntry: UploadedFileEntry) => ({
          name: fileEntry.name,
          validation_status: fileEntry.validation_status,
          validation_message: fileEntry.validation_message,
          extracted_data: fileEntry.extracted_data,
          base64: fileEntry.base64
        }));
        return acc;
      }, {} as { [key: string]: Array<Omit<UploadedFileEntry, 'file'>> }),
      flowPath: flowPath,
      selectedProcedureType: selectedProcedureType
    };
    console.log("Simulating API send with data:", dataToSend);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.3;
      if (success && loadedMessages) {
        setApiResponseMessage(loadedMessages.send_success_message);
      } else if (loadedMessages) {
        setApiResponseMessage(loadedMessages.send_error_message);
      }
    } catch (error: unknown) {
      console.error("API Error:", error instanceof Error ? error.message : String(error));
      if (loadedMessages) {
        setApiResponseMessage(loadedMessages.send_error_message);
      }
    } finally {
      setSendingData(false);
    }
  };

  const orderedAllRequiredDocuments = useMemo((): DocumentRequirement[] => {
    if (!loadedFlowData) return [];
    const allDocs: { [key: string]: DocumentRequirement } = {};
    [...questionsAnswered, currentQuestionId].forEach((qId: string) => { // Include currentQuestionId for current step's docs
        const q: FlowStep | undefined = loadedFlowData.flow.find((f: FlowStep) => f.id === qId);
        if (q && q.type === "info_block" && q.documents) {
            q.documents.forEach((docReq: DocumentRequirement) => {
                if (!allDocs[docReq.name]) { // Avoid duplicates, keep first encounter (order might matter based on flow)
                    allDocs[docReq.name] = docReq;
                }
            });
        }
    });
    return Object.values(allDocs);
  }, [loadedFlowData, questionsAnswered, currentQuestionId]);

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

  const safeCurrentContent = loadedFlowData.flow.find((q: FlowStep) => q.id === currentQuestionId) || null;

  if (!safeCurrentContent) {
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
      <div className="w-full max-w-2xl flex justify-end mb-4">
        <button
          onClick={() => setShowLanguageModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-semibold"
        >
          {loadedMessages.change_language_button || "Change Language"}
        </button>
      </div>

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
            messages={loadedMessages}
            userId={userId}
            // AI Summary Props
            aiSummaryData={aiSummaryData}
            isAISummaryLoading={isAISummaryLoading}
            handleGenerateAISummary={handleGenerateAISummary}
            aiSummaryError={aiSummaryError}
            handleApplyAISuggestions={handleApplyAISuggestions} // ADDED
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
            messages={loadedMessages}
            handleShowAttributesModal={handleShowAttributesModal}
          />
        ) : (
          currentContent &&
          <QuestionnaireScreen
            currentContent={currentContent}
            handleAnswer={handleAnswer}
            handleShowAttributesModal={handleShowAttributesModal}
            uploadedFiles={uploadedFiles}
            handleFileChange={handleFileChange}
            handleValidateDocument={handleValidateDocument}
            handleRemoveFile={handleRemoveFile}
            loadingValidation={loadingValidation}
            isCurrentStepRequiredDocumentsValidated={isCurrentStepRequiredDocumentsValidated}
            handleContinueWithValidation={handleContinueWithValidation}
            handleContinueWithoutValidationClick={handleContinueWithoutValidationClick}
            fileInputRefs={fileInputRefs}
            messages={loadedMessages}
            orderedAllRequiredDocuments={orderedAllRequiredDocuments}
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
        title={loadedMessages.confirm_no_validation_title}
        message={loadedMessages.confirm_no_validation_message}
        onConfirm={handleConfirmContinue}
        onCancel={handleCancelContinue}
        yesButtonText={loadedMessages.confirm_no_validation_yes_button}
        noButtonText={loadedMessages.confirm_no_validation_no_button}
      />

      {showLanguageModal && (
        <LanguageSelectionScreen
          onLanguageSelected={() => setShowLanguageModal(false)}
          messages={loadedMessages}
        />
      )}

      <AttributesModal
        isOpen={showAttributesModal}
        onClose={() => setShowAttributesModal(false)}
        data={currentAttributesData}
        title={loadedMessages.attributes_modal_title || "Extracted Attributes"}
      />

      <p className="text-xs text-gray-500 mt-4">{loadedMessages.user_id_label} {userId || (loadedMessages ? loadedMessages.loading_app : "...")}</p>
    </div>
  );
}

export default App;
