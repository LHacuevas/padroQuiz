// src/components/DocumentUpload.tsx
import React from 'react';
import { type DocumentUploadProps } from '../interfaces';
import { Upload, XCircle, CheckCircle, Trash2 } from 'lucide-react';

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  docReq, uploadedFilesForDoc, onFileChange, onValidateDocument, onRemoveFile, loadingValidation, fileInputRef, messages
}) => {
  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-blue-100">
      <p className="text-lg font-semibold text-gray-800">{docReq.name}</p>
      <p className="text-gray-600 text-sm mb-3">{docReq.description}</p>

      {/* Show file input ONLY if no files are uploaded OR if multiple files are allowed */}
      {(!uploadedFilesForDoc || uploadedFilesForDoc.length === 0 || docReq.multiple_files) && (
        <input
          type="file"
          multiple={docReq.multiple_files}
          onChange={(e) => onFileChange(e, docReq.name)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-indigo-700 hover:file:bg-blue-100 cursor-pointer"
          ref={fileInputRef} // This ref might need to be managed differently if multiple inputs use it, or be specific if only one.
                           // For now, assuming it's handled by parent by key if needed.
        />
      )}

      {uploadedFilesForDoc && uploadedFilesForDoc.map((fileEntry, fileIndex) => (
        <div key={fileIndex} className="mt-3 p-3 border border-gray-200 rounded-md bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="flex items-center text-gray-700 text-sm">
              {fileEntry.validation_status === 'valid' && <CheckCircle size={18} className="text-green-500 mr-2" />}
              {fileEntry.validation_status === 'invalid' && <XCircle size={18} className="text-red-500 mr-2" />}
              {fileEntry.validation_status === 'pending' && <Upload size={18} className="text-yellow-500 animate-pulse mr-2" />}
              {fileEntry.validation_status === 'uploading' && <span className="animate-spin mr-2">⚙️</span>}
              {fileEntry.name}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onValidateDocument(docReq.name, fileIndex)}
                className="px-3 py-1 bg-indigo-500 text-white rounded-md text-xs hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={loadingValidation || fileEntry.validation_status === 'valid' || fileEntry.validation_status === 'uploading'}
              >
                {loadingValidation && fileEntry.validation_status === 'pending' ? messages.file_validation_loading_button : messages.file_validation_button}
              </button>
              <button
                onClick={() => onRemoveFile(docReq.name, fileIndex)}
                className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                title={messages.file_remove_button}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {fileEntry.validation_message && (
            <p className={`text-xs mt-1 ${fileEntry.validation_status === 'invalid' ? 'text-red-600' : 'text-gray-500'}`}>
              {messages.file_validation_reason} {fileEntry.validation_message}
            </p>
          )}
          {fileEntry.extracted_data && fileEntry.extracted_data.name && (
            <p className="text-xs mt-1 text-blue-600">
              {messages.file_extracted_data} {fileEntry.extracted_data.name} (ID: {fileEntry.extracted_data.id_number})
            </p>
          )}
        </div>
      ))}
       {(!uploadedFilesForDoc || uploadedFilesForDoc.length === 0) && !docReq.multiple_files && (
           <p className="text-gray-500 text-sm italic mt-2">No se ha proporcionado ningún archivo para este documento.</p>
       )}
    </div>
  );
};

export default DocumentUpload;
