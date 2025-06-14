import React from 'react';

interface AttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  title: string; // For translated title
}

const AttributesModal: React.FC<AttributesModalProps> = ({ isOpen, onClose, data, title }) => {
  if (!isOpen || !data) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{title}</h3>
          <div className="mt-2 px-7 py-3 max-h-60 overflow-y-auto">
            {Object.entries(data).length > 0 ? (
              <ul className="space-y-2 text-sm text-left">
                {Object.entries(data).map(([key, value]) => (
                  <li key={key} className="grid grid-cols-2 gap-2 odd:bg-gray-50 p-1 rounded">
                    <strong className="font-semibold truncate">{key}:</strong>
                    <span className="truncate">{String(value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No attributes extracted.</p>
            )}
          </div>
          <div className="items-center px-4 py-3 mt-4">
            <button
              id="ok-btn"
              className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttributesModal;
