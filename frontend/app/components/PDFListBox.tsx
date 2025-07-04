'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface PDF {
  file_id: string;
  filename: string;
  status?: string;
  num_chunks?: number;
}

const PDFListBox: React.FC = () => {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);

  // Only fetch PDFs once when the component mounts
  useEffect(() => {
    console.log('PDFListBox mounted, fetching PDFs once on mount...');
    fetchPDFs();
    // No auto-refresh interval - only manual refresh via button
  }, []);

  const fetchPDFs = async (isRefresh = false) => {
    try {
      setLoading(true);
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] PDFListBox component: Fetching PDFs${isRefresh ? ' (refresh requested)' : ''}...`);
      
      // Add cache-busting only when explicitly refreshing
      const url = isRefresh 
        ? `/api/list-pdfs?source=listbox&refresh=true&t=${Date.now()}` 
        : `/api/list-pdfs?source=listbox`;
        
      const response = await fetch(url, {
        cache: isRefresh ? 'no-cache' : 'default',
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('PDFs fetched:', data);
      
      if (data.pdfs) {
        setPdfs(data.pdfs);
      } else {
        console.warn('No PDFs array in response');
        setPdfs([]);
      }
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast.error('Failed to fetch PDFs');
      setPdfs([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to render status indicators
  const renderStatusDot = (status?: string) => {
    if (status === 'completed') {
      return <span className="w-2 h-2 rounded-full bg-green-500 mr-2" title="Completed"></span>;
    } else if (status === 'processing') {
      return <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" title="Processing"></span>;
    } else {
      return <span className="w-2 h-2 rounded-full bg-gray-500 mr-2" title="Unknown status"></span>;
    }
  };

  return (
    <div className="w-full bg-primary-900 border border-primary-700 rounded-md p-3">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => fetchPDFs(true)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      <div className="max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="p-3 text-center text-gray-400 text-sm">
            Loading PDFs...
          </div>
        ) : pdfs.length === 0 ? (
          <div className="p-3 text-center text-gray-400 text-sm">
            No PDFs available
          </div>
        ) : (
          <ul className="divide-y divide-primary-800">
            {pdfs.map((pdf) => (
              <li key={pdf.file_id} className="py-2 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 mr-3 min-w-0">
                    <span className="text-sm text-gray-200 truncate max-w-[280px]">{pdf.filename}</span>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {pdf.num_chunks && pdf.num_chunks > 0 ? `${pdf.num_chunks} chunks` : ''}
                    </span>
                  </div>
                </div>
                {pdf.status && pdf.status !== 'completed' && pdf.status === 'processing' && (
                  <div className="mt-1">
                    <span className="text-xs text-yellow-400">Processing...</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PDFListBox;
