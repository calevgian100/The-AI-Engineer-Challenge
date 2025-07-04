import React, { useState } from 'react';
import { DocumentTextIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface Source {
  text: string;
  source: string;
  score: number;
}

interface RAGSourcesProps {
  sources: Source[];
}

const RAGSources: React.FC<RAGSourcesProps> = ({ sources }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Add debug logging
  console.log('RAGSources component received:', sources);
  
  // Sort sources by relevance score (highest first) and take only the top one
  const sortedSources = [...sources]
    .sort((a, b) => b.score - a.score)
    .slice(0, 1); // Only keep the top source
    
  // If no sources are found, return null
  if (sortedSources.length === 0) {
    console.log('No sources to display');
    return null;
  }
  
  return (
    <div className="mt-2 bg-primary-900 border border-primary-800 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-sm text-gray-300 hover:bg-primary-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <DocumentTextIcon className="h-4 w-4 mr-2 text-neonGreen" />
          <span>Source</span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-3 border-t border-primary-800">
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {sortedSources.map((source, index) => (
              <div key={index} className="text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-neonGreen">
                    Source: {source.source}
                  </span>
                  <span className="text-gray-400">
                    Relevance: {(source.score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-gray-300 bg-primary-950 p-2 rounded overflow-x-auto">
                  {source.text.length > 300 
                    ? `${source.text.substring(0, 300)}...` 
                    : source.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGSources;
