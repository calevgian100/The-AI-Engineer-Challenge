import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowPathIcon, BookmarkIcon, FolderOpenIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

interface ConversationManagerProps {
  currentMessages: Message[];
  onNewConversation: () => void;
  onLoadConversation: (messages: Message[]) => void;
}

const ConversationManager: React.FC<ConversationManagerProps> = ({
  currentMessages,
  onNewConversation,
  onLoadConversation,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSavedConversations, setShowSavedConversations] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Load conversations from localStorage on component mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('saved_conversations');
    if (savedConversations) {
      try {
        setConversations(JSON.parse(savedConversations));
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
      }
    }
  }, []);

  // Generate a title for the current conversation based on the first user message
  useEffect(() => {
    if (currentMessages.length > 0 && showSaveDialog && !conversationTitle) {
      const firstUserMessage = currentMessages.find(msg => msg.role === 'user')?.content || '';
      const title = firstUserMessage.substring(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
      setConversationTitle(title || 'New Conversation');
    }
  }, [currentMessages, showSaveDialog, conversationTitle]);

  const saveConversation = () => {
    if (currentMessages.length === 0) return;
    
    if (!showSaveDialog) {
      setShowSaveDialog(true);
      return;
    }
    
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: conversationTitle || 'Conversation ' + new Date().toLocaleString(),
      messages: [...currentMessages],
      timestamp: Date.now(),
    };
    
    const updatedConversations = [...conversations, newConversation];
    setConversations(updatedConversations);
    localStorage.setItem('saved_conversations', JSON.stringify(updatedConversations));
    
    setShowSaveDialog(false);
    setConversationTitle('');
  };

  const loadConversation = (conversation: Conversation) => {
    onLoadConversation(conversation.messages);
    setShowSavedConversations(false);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedConversations = conversations.filter(conv => conv.id !== id);
    setConversations(updatedConversations);
    localStorage.setItem('saved_conversations', JSON.stringify(updatedConversations));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={onNewConversation}
            className="flex items-center px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
            title="New Conversation (Ctrl/Cmd+N)"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New
          </button>
          
          <button
            id="save-conversation-btn" // ID for keyboard shortcut reference
            onClick={saveConversation}
            disabled={currentMessages.length === 0}
            className={`flex items-center px-3 py-1 text-sm rounded-md ${
              currentMessages.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title="Save Conversation (Ctrl/Cmd+S)"
          >
            <BookmarkIcon className="h-4 w-4 mr-1" />
            Save
          </button>
          
          <button
            onClick={() => setShowSavedConversations(!showSavedConversations)}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            title="Load Conversation"
          >
            <FolderOpenIcon className="h-4 w-4 mr-1" />
            {conversations.length > 0 ? `Load (${conversations.length})` : 'Load'}
          </button>
        </div>
        
        {currentMessages.length > 0 && (
          <span className="text-xs text-gray-500">
            {currentMessages.length} message{currentMessages.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
          <label htmlFor="conversation-title" className="block text-sm font-medium text-gray-700 mb-1">
            Conversation Title
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="conversation-title"
              value={conversationTitle}
              onChange={(e) => setConversationTitle(e.target.value)}
              placeholder="Enter a title for this conversation"
              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
            <button
              onClick={saveConversation}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setConversationTitle('');
              }}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Saved Conversations List */}
      {showSavedConversations && conversations.length > 0 && (
        <div className="mt-2 max-h-64 overflow-y-auto bg-white rounded-md border border-gray-200 divide-y divide-gray-100">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => loadConversation(conversation)}
              className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800 truncate">{conversation.title}</div>
                <div className="text-xs text-gray-500">{formatDate(conversation.timestamp)} · {conversation.messages.length} messages</div>
              </div>
              <button
                onClick={(e) => deleteConversation(conversation.id, e)}
                className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
                title="Delete Conversation"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {showSavedConversations && conversations.length === 0 && (
        <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 text-center text-sm text-gray-500">
          No saved conversations yet
        </div>
      )}
    </div>
  );
};

export default ConversationManager;
