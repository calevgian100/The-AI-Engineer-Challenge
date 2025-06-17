import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800">Help & Keyboard Shortcuts</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Enter your OpenAI API key in the settings panel</li>
              <li>Select a model from the dropdown (default is gpt-4.1-mini)</li>
              <li>Customize the system prompt if desired</li>
              <li>Type your message and press Enter or click the send button</li>
            </ol>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Keyboard Shortcuts</h3>
            <div className="bg-gray-50 rounded-md p-4">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 pr-4 font-mono text-sm">Enter</td>
                    <td className="py-2">Send message</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 pr-4 font-mono text-sm">Shift + Enter</td>
                    <td className="py-2">Insert new line</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 pr-4 font-mono text-sm">Esc</td>
                    <td className="py-2">Close modals</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 pr-4 font-mono text-sm">Ctrl/Cmd + N</td>
                    <td className="py-2">New conversation</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-sm">Ctrl/Cmd + S</td>
                    <td className="py-2">Save conversation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">API Key Security</h3>
            <p className="text-gray-700">
              Your OpenAI API key is stored locally in your browser and is never sent to our servers.
              It is only used to make direct requests to OpenAI's API.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Models</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>GPT-4.1-mini</strong>: Balanced performance and cost</li>
              <li><strong>GPT-4o</strong>: High performance, multimodal capabilities</li>
              <li><strong>GPT-4 Turbo</strong>: Advanced reasoning with larger context window</li>
              <li><strong>GPT-3.5 Turbo</strong>: Fast and cost-effective</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
