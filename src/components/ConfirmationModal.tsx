// src/components/ConfirmationModal.tsx
import React from 'react';
import { ConfirmationModalProps } from '../interfaces';

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  showModal, title, message, onConfirm, onCancel, yesButtonText, noButtonText
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <h3 className="text-xl font-bold text-red-700 mb-4">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-around space-x-4">
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
          >
            {yesButtonText}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors shadow-md"
          >
            {noButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
