import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { DocumentTextIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PDF {
  file_id: string;
  filename: string;
  num_chunks: number;
  status?: string;
}

interface PDFDropdownProps {
  onPDFSelected?: (fileId: string) => void;
  currentFileId: string | null;
}

const PDFDropdown: React.FC<PDFDropdownProps> = ({ onPDFSelected, currentFileId }) => {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Only fetch PDFs when the component mounts
  useEffect(() => {
    console.log('PDFDropdown mounted, fetching PDFs once on mount...');
    fetchPDFs();
    // No auto-refresh interval
  }, []);
  
  // Don't re-fetch when currentFileId changes
  useEffect(() => {
    console.log(`PDFDropdown: currentFileId changed to ${currentFileId}, NOT re-fetching PDFs`);
    // Just update the selected file in the UI if needed
  }, [currentFileId]);

  const fetchPDFs = async (isRefresh = false) => {
    try {
      setLoading(true);
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] PDFDropdown component: Fetching PDFs from /api/list-pdfs`);
      
      // Add cache-busting only when explicitly refreshing
      const url = isRefresh 
        ? `/api/list-pdfs?source=dropdown&refresh=true&t=${Date.now()}` 
        : `/api/list-pdfs?source=dropdown`;
        
      const response = await fetch(url, {
        cache: isRefresh ? 'no-cache' : 'default',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch PDFs: ${response.status}`);
      }
      const data = await response.json();
      console.log('Received PDF data:', data);
      
      // Set PDFs and log the result
      setPdfs(data.pdfs || []);
      console.log('Updated PDFs state:', data.pdfs || [], 'Length:', (data.pdfs || []).length);
      
      // Force refresh UI
      setTimeout(() => {
        console.log('Current PDFs state after timeout:', pdfs, 'Length:', pdfs.length);
      }, 500);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast.error('Failed to load available PDFs');
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
      // For unknown status, mark as completed to allow selection
      console.log('PDF with unknown status will be treated as completed');
      return <span className="w-2 h-2 rounded-full bg-green-500 mr-2" title="Ready to use"></span>;
    }
  };

  const handleSelectPDF = (fileId: string) => {
    if (onPDFSelected) {
      onPDFSelected(fileId);
      toast.success('PDF selected');
    }
    setIsOpen(false);
    // Find the selected PDF to show a confirmation
    const selectedPDF = pdfs.find(pdf => pdf.file_id === fileId);
    if (selectedPDF) {
      toast.success(`Selected PDF: ${selectedPDF.filename}`);
    }
  };

  // Find current PDF name if any
  const currentPDF = pdfs.find(pdf => pdf.file_id === currentFileId);
  
  // Always render the dropdown, even if no PDFs are available

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary-800 hover:bg-primary-700 text-gray-200 text-sm transition-colors"
          aria-label="Select PDF for RAG"
        >
          <DocumentTextIcon className="w-4 h-4 text-neonGreen" />
          {loading ? (
            <span>Loading PDFs...</span>
          ) : currentPDF ? (
            <span className="truncate max-w-[150px]">{currentPDF.filename}</span>
          ) : (
            <span>Select PDF</span>
          )}
          <ChevronDownIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetchPDFs(true); // Pass true to indicate this is a manual refresh
            toast.success('Refreshing PDF list...');
          }}
          className="p-2 rounded-md bg-primary-800 hover:bg-primary-700 text-gray-200 text-sm transition-colors"
          aria-label="Refresh PDF list"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-72 max-h-96 overflow-y-auto bg-primary-900 border border-primary-700 rounded-md shadow-lg right-0">
          <div className="py-1">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                Loading PDFs...
              </div>
            ) : pdfs.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No PDFs available
              </div>
            ) : (
              <ul>
                {pdfs.map((pdf) => (
                  <li key={pdf.file_id}>
                    <button
                      onClick={() => handleSelectPDF(pdf.file_id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-800 flex items-center justify-between ${pdf.file_id === currentFileId ? 'bg-primary-700 text-neonGreen' : 'text-gray-200'}`}
                    >
                      <div className="flex flex-col flex-1 min-w-0 mr-3">
                        <span className="truncate max-w-[220px]">{pdf.filename}</span>
                        {pdf.status && pdf.status !== 'completed' && pdf.status === 'processing' && (
                          <span className="text-xs text-yellow-400">Processing...</span>
                        )}
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {pdf.num_chunks > 0 ? `${pdf.num_chunks} chunks` : ''}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFDropdown;
