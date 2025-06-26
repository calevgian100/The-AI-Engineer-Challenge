'use client';

import { useState, useEffect, useRef } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import ChatMessage from './components/ChatMessage';
import TypingIndicator from './components/TypingIndicator';
import ChatInput from './components/ChatInput';
import HelpModal from './components/HelpModal';
import TrainerSelector from './components/TrainerSelector';
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
  
  // Base persona that all trainers inherit from
  const basePersona = 
    'You are a CrossFit trainer/coach AND nutritionist. ' +
    'You are directly speaking to the user as their personal coach, not as a third party. ' +
    'Never suggest that the user should "check with their coach" since YOU are their coach. ' +
    'Format any tables properly with markdown so they display correctly in the chat. ' +
    'Assume the user\'s experience level matches your own unless they specify otherwise. ' +
    'IMPORTANT: Never include "[DONE]" in your responses as this is an internal marker. ' +
    'If you need to present tabular data, use proper markdown table format with headers and aligned columns.';

  // Trainer personas
  const trainerPersonas = {
    expert: {
      name: "Elite Trainer",
      message: `${basePersona} You are an elite CrossFit coach with 15+ years of experience. Respond with deep expertise about fitness, ` +
      'provide detailed and accurate information about CrossFit workouts, techniques, nutrition, and training methodologies. ' +
      'Use advanced CrossFit terminology and motivational language. Your goal is to help users maximize their ' +
      'CrossFit performance through expert advice. Assume the user is advanced unless they indicate otherwise. ' +
      'If you do not know the answer, acknowledge it and suggest reliable resources.'
    },
    standard: {
      name: "Regular Trainer",
      message: `${basePersona} You are a CrossFit coach with 5 years of experience. Respond to all questions with enthusiasm about fitness, ` +
      'provide accurate information about CrossFit workouts, techniques, nutrition, and training methodologies. ' +
      'Use CrossFit terminology and motivational language when appropriate. Your goal is to help users improve their ' +
      'CrossFit performance and overall fitness. Assume the user has intermediate experience unless they indicate otherwise. ' +
      'If you do not know the answer, say so.'
    },
    beginner: {
      name: "Novice Trainer",
      message: `${basePersona} You are a new CrossFit trainer who recently got certified. You have basic knowledge but limited experience. ` +
      'Be enthusiastic but sometimes unsure about advanced topics. Stick to fundamental CrossFit movements and basic nutrition advice. ' +
      'Occasionally mention that you\'re still learning certain advanced techniques. Focus on encouragement rather than technical expertise. ' +
      'Assume the user is a beginner unless they indicate otherwise. Be honest when you don\'t know something.'
    }
  };
  
  // State for current trainer
  const [currentTrainer, setCurrentTrainer] = useState<keyof typeof trainerPersonas>('standard');
  
  // Get the current developer message based on selected trainer
  const developerMessage = trainerPersonas[currentTrainer].message;
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
        if (text.includes('\n\n__STREAM_COMPLETE__')) {
          console.log('Found explicit completion marker');
          // Remove the marker from the message
          assistantMessage += text.replace('\n\n__STREAM_COMPLETE__', '');
          streamComplete = true;
        } else if (text.includes('\n\n[DONE]')) {
          // Handle legacy marker for backward compatibility
          console.log('Found legacy completion marker');
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
    <div className="flex flex-col h-screen max-h-screen bg-primary-950">
      {/* Header that appears when messages are present */}
      {messages.length > 0 && (
        <div className="bg-primary-900 border-b border-primary-800 py-3 px-4 flex flex-col sm:flex-row justify-center items-center relative overflow-hidden gap-4">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neonGreen to-transparent"></div>
          </div>
          <h1 className="text-2xl font-bold text-neonGreen relative z-10 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 3a7 7 0 100 14 7 7 0 000-14zm-9 7a9 9 0 1118 0 9 9 0 01-18 0z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 019 10V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            WODWise
          </h1>
          <TrainerSelector 
            trainers={trainerPersonas}
            currentTrainer={currentTrainer}
            onTrainerChange={(trainerId) => {
              setCurrentTrainer(trainerId as keyof typeof trainerPersonas);
              // Clear messages when changing trainers
              if (messages.length > 0) {
                if (confirm('Changing trainers will start a new conversation. Continue?')) {
                  setMessages([]);
                }
              }
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-grow p-4 text-center">
                <h1 className="text-4xl font-bold text-neonGreen mb-4">WOD-Wise</h1>
                <p className="text-xl text-gray-300 mb-6">Your CrossFit Tr-AI-ning Assistant</p>
                <div className="max-w-md text-gray-400 text-sm mb-6">
                  <p className="mb-4">Ask me anything about CrossFit workouts, techniques, nutrition, or training plans!</p>
                </div>
                <div className="mb-6">
                  <TrainerSelector 
                    trainers={trainerPersonas}
                    currentTrainer={currentTrainer}
                    onTrainerChange={(trainerId) => {
                      setCurrentTrainer(trainerId as keyof typeof trainerPersonas);
                    }}
                  />
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
          <div className="flex items-center justify-center space-x-3 w-full max-w-6xl mx-auto">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={isLoading} 
            />
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="p-2 rounded-full bg-black text-neonGreen border border-neonGreen hover:bg-primary-800 transition-colors duration-200"
              title="Help"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}
