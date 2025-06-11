// src/interfaces.ts
import React from 'react';

export interface MessageTexts {
  [key: string]: string;
}

export interface FlowOption {
  text: string;
  next_question_id: string;
}

export interface DocumentRequirement {
  name: string;
  description: string;
  multiple_files: boolean;
  id_extractable?: boolean;
}

export interface FlowStep {
  id: string;
  question?: string;
  type: "single_choice" | "info_block";
  options?: FlowOption[];
  text?: string;
  documents?: DocumentRequirement[];
  end_flow?: boolean;
  next_question_id?: string; // For info_blocks that proceed
}

export interface FlowData {
    flow: FlowStep[];
}

export interface UploadedFileEntry {
  file?: File; // Present when first uploaded, might be removed for saving
  name: string;
  base64: string | null;
  validation_status: 'pending' | 'valid' | 'invalid' | 'uploading';
  validation_message: string;
  extracted_data: {
    name?: string;
    id_number?: string;
  };
}

export interface UploadedFiles {
  [docName: string]: UploadedFileEntry[];
}

export interface Person {
  name: string;
  id_number: string;
}

export interface FlowPathEntry {
    id: string;
    text: string;
}

// Props for Breadcrumbs.tsx
export interface BreadcrumbsProps {
    flowPath: FlowPathEntry[];
}

// Props for ConfirmationModal.tsx
export interface ConfirmationModalProps {
    showModal: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    yesButtonText: string;
    noButtonText: string;
}

// Props for DocumentUpload.tsx
export interface DocumentUploadProps {
    docReq: DocumentRequirement;
    uploadedFilesForDoc: UploadedFileEntry[];
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>, docName: string) => void;
    onValidateDocument: (docName: string, fileIndex: number) => Promise<void>;
    onRemoveFile: (docName: string, fileIndex: number) => void;
    loadingValidation: boolean;
    fileInputRef?: (el: HTMLInputElement | null) => void; // For specific input ref if needed
    messages: MessageTexts; // For button texts etc.
}

// Props for QuestionnaireScreen.tsx
export interface QuestionnaireScreenProps {
    currentContent: FlowStep;
    handleAnswer: (nextId: string) => void;
    uploadedFiles: UploadedFiles;
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>, docName: string) => void;
    handleValidateDocument: (docName: string, fileIndex: number) => Promise<void>;
    handleRemoveFile: (docName: string, fileIndex: number) => void;
    loadingValidation: boolean;
    isCurrentStepRequiredDocumentsValidated: () => boolean;
    handleContinueWithValidation: () => void;
    handleContinueWithoutValidationClick: () => void;
    fileInputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    messages: MessageTexts;
    orderedAllRequiredDocuments: DocumentRequirement[]; // Needed for handleFileChange logic
}

// Props for FinalDocumentReviewScreen.tsx
export interface FinalDocumentReviewScreenProps {
    orderedAllRequiredDocuments: DocumentRequirement[];
    uploadedFiles: UploadedFiles;
    handleValidateDocument: (docName: string, fileIndex: number) => Promise<void>;
    handleRemoveFile: (docName: string, fileIndex: number) => void;
    loadingValidation: boolean;
    proceedToSummary: () => void;
    fileInputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    messages: MessageTexts;
}

// Props for SummaryScreen.tsx
export interface SummaryScreenProps {
    registrationAddress: string;
    peopleToRegister: Person[];
    showAddressEdit: boolean;
    tempAddress: string;
    setTempAddress: (value: string) => void;
    handleAddressSave: () => void;
    handleAddressEditToggle: () => void;
    handleRemovePerson: (idNumber: string) => void;
    apiResponseMessage: string;
    handleSendAll: () => Promise<void>;
    sendingData: boolean;
    goBack: () => void; // Added goBack prop
    messages: MessageTexts;
    userId: string | null; // Added userId for display
}
