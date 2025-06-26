import React, { useState, KeyboardEvent } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
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
    <div className="p-4 flex justify-center w-full">
      <div className="flex items-end space-x-2 w-full bg-primary-900 border border-primary-800 rounded-lg shadow-lg px-4 py-3 transition-all duration-300 hover:border-neonGreen/50 focus-within:border-neonGreen focus-within:shadow-[0_0_15px_rgba(57,255,20,0.15)]">
        <textarea
          className="flex-1 p-2 bg-primary-900 text-white border-none focus:outline-none focus:ring-0 resize-none placeholder-gray-400 text-sm"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className={`p-2 rounded-full ${
            !message.trim() || disabled
              ? 'bg-primary-800 text-gray-500 cursor-not-allowed'
              : 'bg-neonGreen text-black hover:bg-white'
          }`}
          title="Send message"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
