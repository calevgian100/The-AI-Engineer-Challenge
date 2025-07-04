'use client';

import { useState, useEffect, useRef } from 'react';
import { QuestionMarkCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import ChatMessage from './components/ChatMessage';
import TypingIndicator from './components/TypingIndicator';
import ChatInput from './components/ChatInput';
import HelpModal from './components/HelpModal';
import TrainerSelector from './components/TrainerSelector';
import PDFUploader from './components/PDFUploader';
import PDFDropdown from './components/PDFDropdown';
import PDFListBox from './components/PDFListBox';
import RAGSources from './components/RAGSources';
import { formatErrorMessage, parseApiError } from './utils/errorHandling';
import React from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: {
    text: string;
    source: string;
    score: number;
  }[];
}

import { Toaster, toast } from 'react-hot-toast';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Base persona that all trainers inherit from
  const basePersona = 
    'You are a CrossFit trainer/coach AND nutritionist. ' +
    'You are directly speaking to the user as their personal coach, not as a third party. ' +
    'Never suggest that the user should "check with their coach" since YOU are their coach. ' +
    'Do not reply with table data as it is hard to format on the chat. ' +
    'Assume the user\'s experience level matches your own unless they specify otherwise. ' +
    'IMPORTANT: Never include "__STREAM_COMPLETE__" in your responses as this is an internal marker. ' +
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
  const [selectedTrainer, setSelectedTrainer] = useState<keyof typeof trainerPersonas>('standard');
  
  // Get the current developer message based on selected trainer
  const developerMessage = trainerPersonas[selectedTrainer].message;
  const model = 'gpt-4.1-mini';

  // No need to load or save settings anymore as we're using hardcoded values

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
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
        setMessages([]);
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
    if (userMessage.trim() === '') return;
    
    // Add user message to chat
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    // Set loading state to show thinking animation
    setIsLoading(true);

    // Get the selected trainer persona
    const developerMessage = selectedTrainer ? trainerPersonas[selectedTrainer].message : basePersona;
    
    if (ragEnabled) {
      console.log('RAG mode enabled, using RAG query endpoint');
    }

    try {
      // Use different endpoints based on RAG mode
      const endpoint = ragEnabled ? '/api/rag-stream' : '/api/chat';
      console.log(`Using endpoint: ${endpoint} with RAG mode: ${ragEnabled}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ragEnabled ? {
          // RAG endpoint format
          query: userMessage,
          system_prompt: developerMessage,
          // Make pdf_id optional - if not provided, search across all PDFs
          ...(uploadedFileId ? { pdf_id: uploadedFileId } : {}),
        } : {
          // Chat endpoint format
          user_message: userMessage,
          developer_message: developerMessage,
          model: model,
          use_rag: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Initialize empty assistant message and sources for both modes
      let assistantMessage = '';
      let messageSources: any[] = [];
      
      // Add an empty assistant message that will be updated with streaming content
      setMessages((prev) => {
        const newMessage: Message = { role: 'assistant', content: '' };
        return [...prev, newMessage];
      });
      
      // For both RAG and non-RAG mode, handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');
      
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
        console.log('Received chunk:', text.substring(0, 50) + '...');
        
        // Handle RAG streaming format (SSE format)
        if (ragEnabled && text.includes('data:')) {
          // Split the text by double newlines to get individual SSE messages
          const events = text.split('\n\n').filter(Boolean);
          
          for (const event of events) {
            // Extract the data part
            const dataMatch = event.match(/^data: (.+)$/m);
            if (!dataMatch) continue;
            
            const data = dataMatch[1];
            console.log('Parsed SSE data:', data.substring(0, 50) + '...');
            
            // Check if this is a sources message
            if (data.startsWith('{"sources":')) {
              try {
                const sourcesData = JSON.parse(data);
                messageSources = sourcesData.sources;
                console.log('Received sources:', messageSources.length);
                // Log each source to check for duplicates
                messageSources.forEach((source, index) => {
                  console.log(`Source ${index}: ${source.source}, Score: ${source.score}, Text: ${source.text.substring(0, 30)}...`);
                });
              } catch (e) {
                console.error('Error parsing sources:', e);
              }
            } 
            // Check for completion marker - be flexible with format
            else if (data.includes('__STREAM_COMPLETE__')) {
              console.log('Found completion marker in SSE');
              streamComplete = true;
            } 
            // Regular content
            else {
              assistantMessage += data;
              
              // Update messages with the current content and sources
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  content: assistantMessage,
                  sources: messageSources.length > 0 ? messageSources : undefined
                };
                return newMessages;
              });
            }
          }
        } 
        // Handle regular streaming (non-RAG mode)
        else {
          // Check for completion marker - be flexible with format
          if (text.includes('__STREAM_COMPLETE__')) {
            console.log('Found completion marker in stream');
            // Remove the marker from the message (handle both formats)
            streamComplete = true;
          } else {
            assistantMessage += text;
          }
          
          // Update messages with the completed assistant message
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              content: assistantMessage
            };
            return newMessages;
          });
        }
      }
      
      console.log('Stream processing complete, turning off loading state');
      // Important: Set loading to false AFTER the stream is fully processed
      setIsLoading(false);
    } catch (error) {
      // Add error message
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: formatErrorMessage(error) },
      ]);
      // Make sure to set loading to false on error too
      setIsLoading(false);
    }
  };
  
  // Handle PDF upload completion
  const handlePDFUploadComplete = (fileId: string) => {
    setUploadedFileId(fileId);
    setRagEnabled(true);
  };

  const handleNewConversation = () => {
    setMessages([]);
  };

  const handleLoadConversation = (loadedMessages: Message[]) => {
    setMessages(loadedMessages);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-primary-950 overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#e2e8f0',
            border: '1px solid #2d3748'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#1a1a2e',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1a1a2e',
            },
          },
        }}
      />
      {/* Header that appears when messages are present */}
      {messages.length > 0 && (
        <div className="bg-primary-900 border-b border-primary-800 py-3 px-4 flex flex-col sm:flex-row justify-between items-center relative overflow-hidden gap-4">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neonGreen to-transparent"></div>
          </div>
          <h1 className="text-2xl font-bold text-neonGreen relative z-10 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 3a7 7 0 100 14 7 7 0 000-14zm-9 7a9 9 0 1118 0 9 9 0 01-18 0z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 019 10V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            WOD-Wise
          </h1>
          <div className="flex items-center space-x-4 relative z-30">
            {/* Only show PDF Dropdown in header during chat */}
            {messages.length > 0 && (
              <PDFDropdown
                onPDFSelected={handlePDFUploadComplete}
                currentFileId={uploadedFileId}
              />
            )}
            <TrainerSelector 
              trainers={trainerPersonas}
              currentTrainer={selectedTrainer}
              onTrainerChange={(trainerId) => {
                setSelectedTrainer(trainerId as keyof typeof trainerPersonas);
                // Clear messages when changing trainers
                if (messages.length > 0) {
                  if (confirm('Changing trainers will start a new conversation. Continue?')) {
                    setMessages([]);
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Area */}
        <div className="w-full max-w-5xl mx-auto flex flex-col h-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[80vh] pt-8">
                <div className="text-center space-y-4 max-w-md">
                  <h1 className="text-4xl font-bold text-neonGreen mb-4">WOD-Wise</h1>
                  <p className="text-xl text-gray-300 mb-6">Your CrossFit Tr-AI-ning Assistant</p>
                  <div className="max-w-md text-gray-400 text-sm mb-6">
                    <p className="mb-4">Ask me anything about CrossFit workouts, techniques, nutrition, or training plans!</p>
                  </div>
                  <div className="mb-6">
                    <TrainerSelector 
                      trainers={trainerPersonas}
                      currentTrainer={selectedTrainer}
                      onTrainerChange={(trainerId) => {
                        setSelectedTrainer(trainerId as keyof typeof trainerPersonas);
                      }}
                    />
                  </div>
                  <div className="mt-8 mb-16">
                    <h2 className="text-xl font-semibold text-neonGreen mb-4">Upload a PDF for RAG</h2>
                    <div className="flex flex-col gap-6 items-start">
                      <PDFUploader onUploadComplete={handlePDFUploadComplete} />
                      <div className="w-full">
                        <PDFListBox />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <React.Fragment key={index}>
                    <ChatMessage role={message.role} content={message.content} />
                    {message.sources && message.sources.length > 0 && (
                      <RAGSources sources={message.sources} />
                    )}
                  </React.Fragment>
                ))}
                {isLoading && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat input */}
          <ChatInput 
            onSendMessage={handleSendMessage} 
            disabled={isLoading}
            isLoading={isLoading}
            ragEnabled={ragEnabled}
            onRagToggle={setRagEnabled}
            hasUploadedPdf={uploadedFileId !== null}
          />
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}
