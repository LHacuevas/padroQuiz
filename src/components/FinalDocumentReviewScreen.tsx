// src/components/FinalDocumentReviewScreen.tsx
import React from 'react';
import DocumentUpload from './DocumentUpload';
import { type FinalDocumentReviewScreenProps } from '../interfaces';
import { FileText } from 'lucide-react';

const FinalDocumentReviewScreen: React.FC<FinalDocumentReviewScreenProps> = ({
  orderedAllRequiredDocuments, uploadedFiles, handleValidateDocument, handleRemoveFile,
  loadingValidation, proceedToSummary, fileInputRefs, messages,
  handleShowAttributesModal // ADDED
}) => {
  return (
    <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
            <p className="text-lg font-medium text-indigo-700 mb-4">{messages.final_document_review_instructions}</p>
        </div>
        <h3 className="text-xl font-bold text-indigo-700 mt-6 mb-4 flex items-center">
            <FileText className="mr-2" /> {messages.final_docs_review_title}
        </h3>
        {orderedAllRequiredDocuments.length > 0 ? (
            orderedAllRequiredDocuments.map((docReq, docIndex) => (
                <DocumentUpload
                    key={docIndex}
                    docReq={docReq}
                    uploadedFilesForDoc={uploadedFiles[docReq.name] || []}
                    onFileChange={() => {
                        // In final review, typically we don't add new files,
                        // but if we wanted to, handleFileChange would be passed from App.tsx
                        // For now, this component focuses on validating/removing existing ones.
                        // If onFileChange is needed, it should be added to props.
                        console.warn("File change not implemented in FinalDocumentReviewScreen's DocumentUpload instances directly.");
                    }}
                    onValidateDocument={handleValidateDocument}
                    onRemoveFile={handleRemoveFile}
                    loadingValidation={loadingValidation}
                    fileInputRef={el => fileInputRefs.current[`final-${docReq.name}-${docIndex}`] = el}
                    messages={messages}
                    handleShowAttributesModal={handleShowAttributesModal} // ADDED
                />
            ))
        ) : (
            <p className="text-gray-600 italic">{messages.final_docs_no_docs_requested}</p>
        )}
        <button
            onClick={proceedToSummary}
            className="w-full p-4 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 ease-in-out transform hover:scale-105 text-lg font-semibold"
        >
            {messages.final_docs_continue_button}
        </button>
    </div>
  );
};

export default FinalDocumentReviewScreen;
