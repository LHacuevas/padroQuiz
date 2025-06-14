// src/components/QuestionnaireScreen.tsx
import React from 'react';
import DocumentUpload from './DocumentUpload';
import { type QuestionnaireScreenProps } from '../interfaces';
import { FileText } from 'lucide-react';

const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({
  currentContent, handleAnswer, uploadedFiles, handleFileChange, handleValidateDocument,
  handleRemoveFile, loadingValidation, isCurrentStepRequiredDocumentsValidated,
  handleContinueWithValidation, handleContinueWithoutValidationClick, fileInputRefs, messages,
  handleShowAttributesModal, // ADDED
  //orderedAllRequiredDocuments // This prop is actually used by handleFileChange in App.tsx, not directly here for rendering loop
}) => {

  // Determine current step documents directly from currentContent
  const currentStepDocs = currentContent.documents || [];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
        {/* Text for final_document_review is handled by its own component/condition in App.tsx */}
        <p className="text-lg font-medium text-indigo-700 mb-4">{currentContent.question || currentContent.text}</p>
      </div>

      {currentContent.type === "single_choice" && currentContent.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentContent.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(option.next_question_id)}
              className="p-4 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 ease-in-out transform hover:scale-105 text-lg font-semibold"
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {currentContent.type === "info_block" && currentStepDocs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-indigo-700 mt-6 mb-4 flex items-center">
            <FileText className="mr-2" /> {messages.docs_required_title}
          </h3>
          {currentStepDocs.map((docReq, docIndex) => (
            <DocumentUpload
              key={docIndex}
              docReq={docReq}
              uploadedFilesForDoc={uploadedFiles[docReq.name] || []}
              onFileChange={handleFileChange}
              onValidateDocument={handleValidateDocument}
              onRemoveFile={handleRemoveFile}
              loadingValidation={loadingValidation}
              fileInputRef={el => fileInputRefs.current[`${docReq.name}-${docIndex}`] = el}
              messages={messages}
              handleShowAttributesModal={handleShowAttributesModal} // ADDED
            />
          ))}
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mt-6">
            <button
              onClick={handleContinueWithValidation}
              className="flex-1 p-4 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 ease-in-out transform hover:scale-105 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isCurrentStepRequiredDocumentsValidated()}
            >
              {messages.continue_button}
            </button>
            <button
              onClick={handleContinueWithoutValidationClick}
              className="flex-1 p-4 bg-orange-500 text-white rounded-lg shadow-md hover:bg-orange-600 transition-colors duration-200 ease-in-out transform hover:scale-105 text-lg font-semibold"
            >
              {messages.continue_without_validation_button}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionnaireScreen;
