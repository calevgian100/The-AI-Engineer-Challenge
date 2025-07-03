import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { PaperAirplaneIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  ragEnabled?: boolean;
  onRagToggle?: (enabled: boolean) => void;
  hasUploadedPdf?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  disabled = false, 
  ragEnabled = false, 
  onRagToggle,
  hasUploadedPdf = false 
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };


  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-700 p-4">
      {onRagToggle && (
        <div className="flex items-center mb-2 text-sm">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={ragEnabled}
                onChange={(e) => onRagToggle(e.target.checked)}
                // Allow toggling even without PDF
              />
              <div className={`block w-10 h-6 rounded-full ${ragEnabled ? 'bg-neonGreen' : 'bg-gray-600'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${ragEnabled ? 'transform translate-x-4' : ''}`}></div>
            </div>
            <div className="flex items-center ml-3">
              <DocumentTextIcon className={`h-4 w-4 mr-1 ${ragEnabled ? 'text-neonGreen' : 'text-gray-400'}`} />
              <span className={ragEnabled ? 'text-neonGreen font-bold' : 'text-gray-400'}>RAG Mode {ragEnabled ? 'On' : 'Off'}</span>
            </div>
          </label>
        </div>
      )}
      <div className="flex items-center space-x-2">
        <textarea
          className="flex-1 bg-primary-900 text-white placeholder-gray-400 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-neonGreen resize-none"
          rows={1}
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className={`p-2 rounded-full ${!message.trim() || disabled ? 'bg-gray-700 text-gray-400' : 'bg-neonGreen text-black'}`}
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
