// components/ConfirmationModal.tsx
'use client';

import { X, AlertTriangle } from 'lucide-react'; // Use an appropriate icon

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void; // Function to call when confirmed
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean; // Show loading state on confirm button
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isConfirming = false,
}: ConfirmationModalProps) {

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      aria-labelledby="confirmation-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 z-50">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <h2 id="confirmation-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500 flex-shrink-0" /> {/* Warning Icon */}
            <span className="break-words">{title}</span> {/* Allow title to wrap */}
          </h2>
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 ml-2" // Added margin
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mb-6">
          {/* Ensure message text can wrap */}
          <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
            {message}
          </p>
        </div>

        {/* Modal Footer/Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            // Apply danger styling for confirm/delete actions
            className="px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
          >
            {isConfirming ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
