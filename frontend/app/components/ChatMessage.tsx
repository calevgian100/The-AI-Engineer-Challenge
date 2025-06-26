import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          role === 'user'
            ? 'bg-neonGreen border border-white text-black shadow-md'
            : 'bg-black border border-neonGreen text-neonGreen shadow-[0_0_10px_rgba(57,255,20,0.15)]'
        }`}
      >
        <div className={`prose prose-sm max-w-none ${role === 'assistant' ? 'prose-invert' : ''}`}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
