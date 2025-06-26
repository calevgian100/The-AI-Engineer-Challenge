import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start">
      <div className="bg-black border border-neonGreen rounded-lg p-3 max-w-[80%]">
        <div className="typing-indicator">
          <span className="bg-neonGreen"></span>
          <span className="bg-neonGreen"></span>
          <span className="bg-neonGreen"></span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
