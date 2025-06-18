'use client';

import { useState, useRef, useEffect } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import ChatMessage from './components/ChatMessage';
import TypingIndicator from './components/TypingIndicator';
import ChatInput from './components/ChatInput';
import HelpModal from './components/HelpModal';
import { formatErrorMessage, parseApiError } from './utils/errorHandling';
import React from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hardcoded values instead of settings
  const developerMessage = 'You are a helpful AI assistant.';
  const model = 'gpt-4.1-mini';

  // No need to load or save settings anymore as we're using hardcoded values

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close help modal with Escape key
      if (e.key === 'Escape' && isHelpModalOpen) {
        setIsHelpModalOpen(false);
        return;
      }
      
      // Cmd/Ctrl + N for new conversation
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewConversation();
        return;
      }
      
      // Cmd/Ctrl + S to save conversation
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && messages.length > 0) {
        e.preventDefault();
        // We'll trigger the save conversation function from the ConversationManager
        // This is just a placeholder as we can't directly call that function
        document.getElementById('save-conversation-btn')?.click();
        return;
      }
      
      // Cmd/Ctrl + / to open help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsHelpModalOpen(true);
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHelpModalOpen, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (userMessage: string) => {
    // Add user message to chat
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    // Set loading state to show thinking animation
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          developer_message: developerMessage,
          model: model,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      // Initialize empty assistant message
      let assistantMessage = '';
      
      // Add an empty assistant message that will be updated with streaming content
      // Important: This happens before we start reading the stream
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      // Process the stream
      let streamComplete = false;
      while (!streamComplete) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete (done flag)');
          streamComplete = true;
          break;
        }

        const text = new TextDecoder().decode(value);
        
        // Check for our explicit completion marker
        if (text.includes('\n\n[DONE]')) {
          console.log('Found explicit completion marker');
          // Remove the marker from the message
          assistantMessage += text.replace('\n\n[DONE]', '');
          streamComplete = true;
        } else {
          assistantMessage += text;
        }
        
        // Update the last message with the accumulated content
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantMessage,
          };
          return newMessages;
        });
        
        // If we found the completion marker, break the loop
        if (streamComplete) {
          break;
        }
      }
      
      console.log('Stream processing complete, turning off loading state');
      // Important: Set loading to false AFTER the stream is fully processed
      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: formatErrorMessage(error) },
      ]);
      // Make sure to set loading to false on error too
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
  };

  const handleLoadConversation = (loadedMessages: Message[]) => {
    setMessages(loadedMessages);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary-700">OpenAI Chat</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="text-gray-500 hover:text-gray-700"
            title="Help"
          >
            <QuestionMarkCircleIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <h2 className="text-xl font-semibold mb-2">Welcome to OpenAI Chat</h2>
                  <p>Start typing below to chat with the AI assistant!</p>
                  <p className="mt-2 text-sm">
                    Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl/Cmd + /</kbd> for help
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <ChatMessage key={index} role={message.role} content={message.content} />
            ))}
            
            {isLoading && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <ChatInput 
            onSendMessage={handleSendMessage} 
            disabled={isLoading} 
          />
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}
