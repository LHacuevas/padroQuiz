// src/components/SummaryScreen.tsx
import React from 'react';
import { type SummaryScreenProps, type Person as PersonInterface } from '../interfaces'; // Ensure Person is imported if AIProcedureSummary uses it
import { CheckSquare, Home, User, Settings, Send, Trash2, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

const SummaryScreen: React.FC<SummaryScreenProps> = ({
  registrationAddress, peopleToRegister, showAddressEdit, tempAddress, setTempAddress,
  handleAddressSave, handleAddressEditToggle, handleRemovePerson, apiResponseMessage,  
  handleSendAll, sendingData, goBack, messages,
  // AI Summary Props
  aiSummaryData, isAISummaryLoading, handleGenerateAISummary, aiSummaryError,
  handleApplyAISuggestions // New prop
}) => {

  const canApplyAISuggestions = aiSummaryData &&
                               (aiSummaryData.registrationAddress || (aiSummaryData.peopleToRegister && aiSummaryData.peopleToRegister.length > 0));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4 flex items-center">
        <CheckSquare className="mr-2 text-green-600" /> {messages.summary_title}
      </h2>

      {/* User Confirmed Data Section */}
      <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-gray-700 font-semibold mb-1 flex items-center"><Home className="mr-2" size={18}/>{messages.summary_address_label}</label>
          {showAddressEdit ? (
            <div className="flex space-x-2">
              <input
                type="text"
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleAddressSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
              >
                {messages.summary_address_save_button}
              </button>
              <button
                onClick={handleAddressEditToggle}
                className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors shadow-md"
              >
                {messages.summary_address_cancel_button}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <p className="text-gray-800 font-medium">{registrationAddress}</p>
              <button
                onClick={handleAddressEditToggle}
                className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
              >
                <Settings size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
        <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center">
          <User className="mr-2" size={18}/>{messages.summary_people_label}
        </h3>
        {peopleToRegister.length > 0 ? (
          <ul className="space-y-2">
            {peopleToRegister.map((person, index) => (
              <li key={index} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm border border-gray-200">
                <span className="text-gray-800">
                  <strong>{person.name || "Nombre no extraído"}</strong> (ID: {person.id_number || "No. no extraído"})
                </span>
                <button
                  onClick={() => handleRemovePerson(person.id_number)}
                  className="p-1 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                  title={messages.file_remove_button}
                >
                  <Trash2 size={20} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 italic">{messages.summary_no_people_extracted}</p>
        )}
      </div>

      {/* AI Summary Section */}
      <div className="mt-6 border-t pt-6">
        <h3 className="text-xl font-bold text-purple-700 mb-3 flex items-center">
          <Zap className="mr-2" /> {messages.ai_suggestion_title || "AI Verification"}
        </h3>
        {!aiSummaryData && !isAISummaryLoading && !aiSummaryError && ( // Show button only if no data, not loading, and no error
            <button
            onClick={handleGenerateAISummary}
            disabled={isAISummaryLoading}
            className="w-full mb-4 px-6 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {messages.get_ai_verification_button || "Get AI Verification"}
          </button>
        )}

        {isAISummaryLoading && (
          <div className="flex items-center justify-center my-4">
            <span className="animate-spin mr-2">⚙️</span>
            <p>{messages.loading_ai_summary || "Loading AI Summary..."}</p>
          </div>
        )}

        {aiSummaryError && !isAISummaryLoading && (
          <div className="my-2 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <AlertTriangle className="mr-2" size={20} />
            <p>{messages.ai_summary_error_message || "Error fetching AI summary:"} {aiSummaryError}</p>
          </div>
        )}

        {aiSummaryData && !isAISummaryLoading && (
          <div className="bg-purple-50 p-4 rounded-lg shadow-inner space-y-3">
            <div>
              <strong className="block text-sm font-medium text-gray-700">{messages.ai_suggested_address || "Suggested Address:"}</strong>
              <p className="text-gray-800">{aiSummaryData.registrationAddress || (messages.ai_address_not_determined || "Not determined")}</p>
            </div>
            <div>
              <strong className="block text-sm font-medium text-gray-700">{messages.ai_suggested_people || "Suggested People to Register:"}</strong>
              {aiSummaryData.peopleToRegister && aiSummaryData.peopleToRegister.length > 0 ? (
                <ul className="list-disc list-inside pl-1 space-y-1">
                  {aiSummaryData.peopleToRegister.map((person: PersonInterface, index: number) => ( // Ensure PersonInterface is used
                    <li key={index} className="text-gray-800">
                      {person.name} ({person.id_number}) - {person.relationToApplicant || (messages.ai_relation_unknown || "Relation unknown")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 italic">{messages.ai_no_people_suggested || "No specific people suggested by AI."}</p>
              )}
            </div>
            <div>
              <strong className="block text-sm font-medium text-gray-700">{messages.ai_confidence_score || "Confidence Score:"}</strong>
              <p className="text-gray-800">{(aiSummaryData.confidenceScore * 100).toFixed(0)}%</p>
            </div>
            <div>
              <strong className="block text-sm font-medium text-gray-700">{messages.ai_reasoning || "Reasoning:"}</strong>
              <p className="text-gray-800 text-xs whitespace-pre-wrap">{aiSummaryData.reasoning}</p>
            </div>
            {canApplyAISuggestions && handleApplyAISuggestions && (
              <button
                onClick={() => handleApplyAISuggestions(aiSummaryData.registrationAddress, aiSummaryData.peopleToRegister)}
                className="w-full mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700 transition-colors font-semibold flex items-center justify-center"
              >
                <CheckCircle className="mr-2" size={20} />
                {messages.use_ai_suggestions_button || "Use AI Suggestions"}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-6">
        {messages.summary_disclaimer}
      </p>

      {apiResponseMessage && (
          <div className={`mt-4 p-3 rounded-lg text-center ${apiResponseMessage.includes("Error") ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {apiResponseMessage}
          </div>
      )}

      <div className="flex justify-between mt-8">
        <button
            onClick={goBack}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors font-semibold"
        >
            {messages.back_button}
        </button>
        <button
          onClick={handleSendAll}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          disabled={sendingData}
        >
          {sendingData ? (
            <>
              <span className="animate-spin mr-2">⚙️</span> {messages.sending_data}
            </>
          ) : (
            <>
              <Send className="mr-2" size={20} /> {messages.send_all_button}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SummaryScreen;
