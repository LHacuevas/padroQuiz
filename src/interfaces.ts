// src/interfaces.ts
import React from 'react';
// Import AIProcedureSummary shape if defined elsewhere, or define here
// For now, assuming a shape definition here or direct use of the imported type in components
// import type { AIProcedureSummary as AIProcedureSummaryShape } from './components/FileProcessor'; // This would be ideal if no circular deps

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
  language_selection_title: string;
  change_language_button: string;
  attributes_button_text: string;
  attributes_modal_title: string;
  get_ai_verification_button: string;
  ai_suggestion_title: string;
  loading_ai_summary: string;
  ai_summary_error_message: string;
  ai_suggested_address: string;
  ai_address_not_determined: string;
  ai_suggested_people: string;
  ai_relation_unknown: string;
  ai_no_people_suggested: string;
  ai_confidence_score: string;
  ai_reasoning: string;
  ai_api_key_not_configured: string;
  use_ai_suggestions_button: string;
  ai_suggestions_applied_message: string;
  no_attributes_extracted: string;
  reset_button_text: string;
  reset_confirm_title: string;
  reset_confirm_message: string;
  reset_confirm_yes: string;
  reset_confirm_no: string;
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
  next_question_id?: string;
}

export interface FlowData {
    flow: FlowStep[];
}

export interface ExtractedEntity {
  fieldName: string;
  description: string;
  value: string;
}

export interface UploadedFileEntry {
  file?: File;
  name: string;
  base64: string | null;
  validation_status: 'pending' | 'valid' | 'invalid' | 'uploading';
  validation_message: string;
  extracted_data: ExtractedEntity[];
}

export interface UploadedFiles {
  [docName: string]: UploadedFileEntry[];
}

export interface Person {
  name: string;
  id_number: string;
  relationToApplicant?: string; // Made optional as AI might not always provide it
}

export interface FlowPathEntry {
    id: string;
    text: string;
}

export interface BreadcrumbsProps {
    flowPath: FlowPathEntry[];
}

export interface ConfirmationModalProps {
    showModal: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    yesButtonText: string;
    noButtonText: string;
}

export interface DocumentUploadProps {
    docReq: DocumentRequirement;
    uploadedFilesForDoc: UploadedFileEntry[];
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>, docName: string) => void;
    onValidateDocument: (docName: string, fileIndex: number) => Promise<void>;
    onRemoveFile: (docName: string, fileIndex: number) => void;
    loadingValidation: boolean;
    fileInputRef?: (el: HTMLInputElement | null) => void;
    messages: Messages;
    handleShowAttributesModal?: (data: ExtractedEntity[]) => void; // Optional here, but required by screens using it
}

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
    messages: Messages;
    orderedAllRequiredDocuments: DocumentRequirement[];
    handleShowAttributesModal: (data: ExtractedEntity[]) => void; // Added
}

export interface FinalDocumentReviewScreenProps {
    orderedAllRequiredDocuments: DocumentRequirement[];
    uploadedFiles: UploadedFiles;
    handleValidateDocument: (docName: string, fileIndex: number) => Promise<void>;
    handleRemoveFile: (docName: string, fileIndex: number) => void;
    loadingValidation: boolean;
    proceedToSummary: () => void;
    fileInputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    messages: Messages;
    handleShowAttributesModal: (data: ExtractedEntity[]) => void; // Added
}

// Shape for AI Summary Data (can also be imported from FileProcessor.tsx if preferred)
export interface AISummaryDataShape {
  registrationAddress?: string;
  peopleToRegister: Person[];
  confidenceScore: number;
  reasoning: string;
}

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
    goBack: () => void;
    messages: Messages;
    userId: string | null;
    // AI Summary Props
    aiSummaryData: AISummaryDataShape | null;
    isAISummaryLoading: boolean;
    aiSummaryError: string | null;
    handleGenerateAISummary: () => Promise<void>;
    handleApplyAISuggestions: (suggestedAddress?: string, suggestedPeople?: Person[]) => void;
}
