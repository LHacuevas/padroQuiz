import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SummaryScreen from './SummaryScreen';
import type { SummaryScreenProps, Person, Messages, AIProcedureSummary } from '../interfaces'; // Ensure AIProcedureSummary is imported
import { Zap } from 'lucide-react'; // Import icons used if they affect test selectors/snapshot

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const original = await importOriginal() as Record<string, any>;
    return {
        ...original, // Export all original icons
        Zap: (props: any) => <svg data-testid="zap-icon" {...props} />, // Mock specific icons used
        CheckSquare: (props: any) => <svg data-testid="checksquare-icon" {...props} />,
        Home: (props: any) => <svg data-testid="home-icon" {...props} />,
        User: (props: any) => <svg data-testid="user-icon" {...props} />,
        Settings: (props: any) => <svg data-testid="settings-icon" {...props} />,
        Send: (props: any) => <svg data-testid="send-icon" {...props} />,
        Trash2: (props: any) => <svg data-testid="trash2-icon" {...props} />,
        AlertTriangle: (props: any) => <svg data-testid="alerttriangle-icon" {...props} />,
        CheckCircle: (props: any) => <svg data-testid="checkcircle-icon" {...props} />,
    };
});


const mockMessages: Messages = {
  summary_title: 'Summary Title',
  summary_address_label: 'Address:',
  summary_address_save_button: 'Save',
  summary_address_cancel_button: 'Cancel',
  summary_people_label: 'People to Register:',
  summary_no_people_extracted: 'No people extracted yet.',
  summary_disclaimer: 'This is a disclaimer.',
  file_remove_button: 'Remove',
  back_button: 'Back',
  send_all_button: 'Send All',
  sending_data: 'Sending...',
  get_ai_verification_button: 'Get AI Verification',
  ai_suggestion_title: 'AI Suggestion',
  loading_ai_summary: 'Loading AI Summary...',
  ai_summary_error_message: 'Error fetching AI summary:',
  ai_suggested_address: 'Suggested Address:',
  ai_address_not_determined: 'Not determined by AI',
  ai_suggested_people: 'Suggested People:',
  ai_relation_unknown: 'Relation unknown',
  ai_no_people_suggested: 'AI no people suggested',
  ai_confidence_score: 'Confidence Score:',
  ai_reasoning: 'Reasoning:',
  use_ai_suggestions_button: 'Use AI Suggestions',
  ai_suggestions_applied_message: 'AI suggestions applied!',
} as Messages;

const mockPerson: Person = { name: 'John Doe', id_number: '12345X' };
const mockAISummary: AIProcedureSummary = {
  registrationAddress: '123 AI Street, AI City',
  peopleToRegister: [{ name: 'AI Person', id_number: 'AI123', relationToApplicant: 'self' }],
  confidenceScore: 0.9,
  reasoning: 'AI thinks this is correct.',
};

const defaultProps: SummaryScreenProps = {
  registrationAddress: 'Initial Address',
  peopleToRegister: [mockPerson],
  showAddressEdit: false,
  tempAddress: '',
  setTempAddress: vi.fn(),
  handleAddressSave: vi.fn(),
  handleAddressEditToggle: vi.fn(),
  handleRemovePerson: vi.fn(),
  apiResponseMessage: '',
  handleSendAll: vi.fn(),
  sendingData: false,
  goBack: vi.fn(),
  messages: mockMessages,
  userId: 'user123',
  aiSummaryData: null,
  isAISummaryLoading: false,
  handleGenerateAISummary: vi.fn(),
  aiSummaryError: null,
  handleApplyAISuggestions: vi.fn(),
};

describe('SummaryScreen', () => {
  it('renders correctly with initial data', () => {
    render(<SummaryScreen {...defaultProps} />);
    expect(screen.getByText(mockMessages.summary_title)).toBeInTheDocument();
    expect(screen.getByText('Initial Address')).toBeInTheDocument();
    expect(screen.getByText(mockPerson.name)).toBeInTheDocument();
    expect(screen.getByText(mockMessages.get_ai_verification_button)).toBeInTheDocument();
  });

  it('calls handleGenerateAISummary when "Get AI Verification" button is clicked', () => {
    const handleGenerateAISummaryMock = vi.fn();
    render(<SummaryScreen {...defaultProps} handleGenerateAISummary={handleGenerateAISummaryMock} />);
    fireEvent.click(screen.getByText(mockMessages.get_ai_verification_button));
    expect(handleGenerateAISummaryMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading state for AI summary', () => {
    render(<SummaryScreen {...defaultProps} isAISummaryLoading={true} />);
    expect(screen.getByText(mockMessages.loading_ai_summary)).toBeInTheDocument();
    expect(screen.getByText(mockMessages.get_ai_verification_button).closest('button')).toBeDisabled();
  });

  it('displays AI summary data when available', () => {
    render(<SummaryScreen {...defaultProps} aiSummaryData={mockAISummary} />);
    expect(screen.getByText(mockMessages.ai_suggestion_title)).toBeInTheDocument();
    expect(screen.getByText(mockAISummary.registrationAddress!)).toBeInTheDocument();
    expect(screen.getByText(mockAISummary.peopleToRegister[0].name)).toBeInTheDocument();
    expect(screen.getByText(`${(mockAISummary.confidenceScore * 100).toFixed(0)}%`)).toBeInTheDocument();
    expect(screen.getByText(mockAISummary.reasoning)).toBeInTheDocument();
    expect(screen.getByText(mockMessages.use_ai_suggestions_button)).toBeInTheDocument();
  });

  it('displays AI summary error when error occurs', () => {
    const errorMessage = "Network failed";
    render(<SummaryScreen {...defaultProps} aiSummaryError={errorMessage} />);
    expect(screen.getByText(`${mockMessages.ai_summary_error_message} ${errorMessage}`)).toBeInTheDocument();
  });

  it('calls handleApplyAISuggestions when "Use AI Suggestion" button is clicked', () => {
    const handleApplyAISuggestionsMock = vi.fn();
    render(
      <SummaryScreen
        {...defaultProps}
        aiSummaryData={mockAISummary}
        handleApplyAISuggestions={handleApplyAISuggestionsMock}
      />
    );
    fireEvent.click(screen.getByText(mockMessages.use_ai_suggestions_button));
    expect(handleApplyAISuggestionsMock).toHaveBeenCalledWith(
      mockAISummary.registrationAddress,
      mockAISummary.peopleToRegister
    );
  });

  it('"Use AI Suggestion" button is not shown if no actionable AI data', () => {
    const summaryWithoutActionableData: AIProcedureSummary = {
      ...mockAISummary,
      registrationAddress: undefined,
      peopleToRegister: [],
    };
    render(<SummaryScreen {...defaultProps} aiSummaryData={summaryWithoutActionableData} />);
    expect(screen.queryByText(mockMessages.use_ai_suggestions_button)).not.toBeInTheDocument();
  });

  it('"Get AI Verification" button is hidden if AI data is present', () => {
    render(<SummaryScreen {...defaultProps} aiSummaryData={mockAISummary} />);
    expect(screen.queryByText(mockMessages.get_ai_verification_button)).not.toBeInTheDocument();
  });

});
