import React from 'react';

interface SettingsPanelProps {
  model: string;
  setModel: (model: string) => void;
  developerMessage: string;
  setDeveloperMessage: (message: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  model,
  setModel,
  developerMessage,
  setDeveloperMessage,
}) => {

  return (
    <div className="w-full md:w-80 h-full bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Settings</h2>
      
      <div className="space-y-4">
        {/* API Key Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            Using API key from environment configuration.
          </p>
        </div>
        
        {/* Model Selection */}
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="gpt-4.1-mini">GPT-4.1-mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>
        
        {/* System Prompt */}
        <div>
          <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 mb-1">
            System Prompt
          </label>
          <textarea
            id="system-prompt"
            value={developerMessage}
            onChange={(e) => setDeveloperMessage(e.target.value)}
            placeholder="Enter system instructions for the AI"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            This sets the behavior and capabilities of the AI assistant.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
