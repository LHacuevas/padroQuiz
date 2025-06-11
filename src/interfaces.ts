// src/interfaces.ts
import React from 'react';

export interface Messages {
  app_title: string;
  app_subtitle: string;
  loading_app: string;
  loading_fallback_message: string;
  summary_title: string;
  summary_address_label: string;
  summary_address_save_button: string;
  summary_address_cancel_button: string;
  summary_people_label: string;
  summary_no_people_extracted: string;
  summary_disclaimer: string;
  question_text: string;
  docs_required_title: string;
  file_status_valid: string;
  file_status_invalid: string;
  file_status_pending: string;
  file_status_uploading: string;
  file_validation_button: string;
  file_validation_loading_button: string;
  file_remove_button: string;
  file_validation_reason: string;
  file_extracted_data: string;
  file_read_error: string;
  ai_response_error: string;
  ai_connection_error: string;
  continue_button: string;
  back_button: string;
  final_docs_review_title: string;
  final_docs_no_docs_requested: string;
  final_docs_continue_button: string;
  alert_all_required_docs_needed: string;
  user_id_label: string;
  confirm_no_validation_title: string;
  confirm_no_validation_message: string;
  confirm_no_validation_yes_button: string;
  confirm_no_validation_no_button: string;
  continue_without_validation_button: string;
  final_document_review_instructions: string;
  send_all_button: string;
  send_success_message: string;
  send_error_message: string;
  sending_data: string;
  breadcrumb_home: string;
  file_not_found_for_validation: string;
  language_selection_title: string; // Added this line
  [key: string]: string; // Allow other keys, useful for dynamic content
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
    messages: Messages; // For button texts etc. Changed MessageTexts to Messages
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
    messages: Messages; // Changed MessageTexts to Messages
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
    messages: Messages; // Changed MessageTexts to Messages
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
    messages: Messages; // Changed MessageTexts to Messages
    userId: string | null; // Added userId for display
}
