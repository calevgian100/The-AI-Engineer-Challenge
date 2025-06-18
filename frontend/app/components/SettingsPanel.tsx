import React from 'react';

const SettingsPanel: React.FC = () => {
  return (
    <div className="w-full md:w-80 h-full bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">AI Chat</h2>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Start chatting with the AI assistant using the input field below.
        </p>
      </div>
    </div>
  );
};

export default SettingsPanel;
