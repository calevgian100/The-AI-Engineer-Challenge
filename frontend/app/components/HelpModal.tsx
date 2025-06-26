import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-primary-900 border border-neonGreen rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-primary-800 p-4">
          <h2 className="text-xl font-semibold text-neonGreen">Help & Keyboard Shortcuts</h2>
          <button 
            onClick={onClose}
            className="text-neonGreen hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-neonGreen mb-2">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Type your message in the input field at the bottom</li>
              <li>Press Enter or click the send button to chat with your CrossFit AI trainer</li>
              <li>Your conversation will appear in the chat area</li>
            </ol>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-neonGreen mb-2">Keyboard Shortcuts</h3>
            <div className="bg-primary-800 border border-primary-700 rounded-md p-4">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-primary-700">
                    <td className="py-2 pr-4 font-mono text-sm text-neonGreen">Enter</td>
                    <td className="py-2 text-white">Send message</td>
                  </tr>
                  <tr className="border-b border-primary-700">
                    <td className="py-2 pr-4 font-mono text-sm text-neonGreen">Shift + Enter</td>
                    <td className="py-2 text-white">Insert new line</td>
                  </tr>
                  <tr className="border-b border-primary-700">
                    <td className="py-2 pr-4 font-mono text-sm text-neonGreen">Esc</td>
                    <td className="py-2 text-white">Close modals</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* API Key Security section removed */}
          
          <div>
            <h3 className="text-lg font-medium text-neonGreen mb-2">About</h3>
            <p className="text-white">
              WODWise uses OpenAI's GPT-4.1-mini model to provide expert CrossFit training advice.
              Get personalized workout tips, nutrition guidance, and motivation from your AI trainer.
            </p>
          </div>
        </div>
        
        <div className="border-t border-primary-800 p-4 bg-primary-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neonGreen text-black rounded-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-neonGreen"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
