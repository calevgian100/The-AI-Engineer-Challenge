import React, { useState, useRef } from 'react';
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PDFUploaderProps {
  onUploadComplete: (fileId: string) => void;
}

interface UploadStatus {
  fileId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message: string;
  filename?: string;
  numChunks?: number;
}

const PDFUploader: React.FC<PDFUploaderProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [showUploader, setShowUploader] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Status check interval reference
  const statusCheckRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        uploadPDF(file);
      } else {
        alert('Please upload a PDF file');
      }
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        uploadPDF(file);
      } else {
        alert('Please upload a PDF file');
      }
    }
  };
  
  const uploadPDF = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    setUploadStatus({
      fileId: '',
      status: 'uploading',
      message: 'Uploading PDF...',
    });
    
    try {
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload PDF');
      }
      
      const data = await response.json();
      
      // Handle the case where the file already exists
      if (data.status === 'already_exists') {
        setUploadStatus({
          fileId: data.file_id,
          status: 'completed',
          message: `PDF was already uploaded and processed.`,
          filename: data.filename,
          numChunks: data.num_chunks
        });
        
        // Notify parent component that upload is complete
        onUploadComplete(data.file_id);
        return;
      }
      
      setUploadStatus({
        fileId: data.file_id,
        status: 'processing',
        message: 'Processing PDF...',
      });
      
      // Start polling for status
      startStatusCheck(data.file_id);
      
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setUploadStatus({
        fileId: '',
        status: 'failed',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };
  
  // Track consecutive not_found responses to handle intermittent issues
  const notFoundCountRef = useRef<number>(0);
  const MAX_NOT_FOUND_COUNT = 3;
  
  const startStatusCheck = (fileId: string) => {
    // Clear any existing interval
    if (statusCheckRef.current) {
      clearInterval(statusCheckRef.current);
      console.log('PDFUploader: Cleared existing status check interval');
    }
    
    // Reset not found counter
    notFoundCountRef.current = 0;
    
    console.log(`PDFUploader: Starting status check interval for file ${fileId}`);
    // Set up polling interval
    statusCheckRef.current = setInterval(async () => {
      try {
        console.log(`PDFUploader: Checking status for file ${fileId}`);
        const response = await fetch(`/api/pdf-status/${fileId}?source=uploader`);
        
        if (response.status === 404) {
          console.log('PDF status endpoint not found. This might happen if the backend is restarted.');
          // Continue with processing as if it's still ongoing
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to check status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle not_found status specially
        if (data.status === 'not_found') {
          console.log(`PDFUploader: Status not found for file ${fileId}, count: ${notFoundCountRef.current + 1}`);
          notFoundCountRef.current += 1;
          
          // If we've seen not_found multiple times, check if the PDF exists in the list
          if (notFoundCountRef.current >= MAX_NOT_FOUND_COUNT) {
            console.log(`PDFUploader: Max not_found count reached, checking if PDF exists in list`);
            try {
              // Try to get the list of PDFs to see if our file is there
              const listResponse = await fetch('/api/list-pdfs');
              if (listResponse.ok) {
                const pdfs = await listResponse.json();
                const foundPdf = pdfs.find((pdf: any) => pdf.file_id === fileId);
                
                if (foundPdf) {
                  console.log(`PDFUploader: Found PDF in list, marking as completed`);
                  // PDF exists in the list, so it's been processed successfully
                  setUploadStatus({
                    fileId,
                    status: 'completed',
                    message: 'PDF processing complete',
                    filename: foundPdf.filename,
                    numChunks: foundPdf.num_chunks,
                  });
                  
                  // Stop polling and notify parent
                  if (statusCheckRef.current) {
                    clearInterval(statusCheckRef.current);
                    statusCheckRef.current = null;
                  }
                  onUploadComplete(fileId);
                  return;
                }
              }
            } catch (listError) {
              console.error('Error checking PDF list:', listError);
            }
          }
          
          // Continue polling if we haven't reached max count or PDF wasn't found in list
          return;
        }
        
        // Reset not found counter for any other status
        notFoundCountRef.current = 0;
        
        setUploadStatus({
          fileId,
          status: data.status as 'uploading' | 'processing' | 'completed' | 'failed',
          message: data.message,
          filename: data.filename,
          numChunks: data.num_chunks,
        });
        
        // If processing is complete or failed, stop polling
        if (data.status === 'completed' || data.status === 'failed') {
          if (statusCheckRef.current) {
            clearInterval(statusCheckRef.current);
            statusCheckRef.current = null;
          }
          
          if (data.status === 'completed') {
            console.log(`PDFUploader: Processing completed for file ${fileId}`);
            // Call onUploadComplete without triggering unnecessary refreshes
            onUploadComplete(fileId);
          }
        }
        
      } catch (error) {
        console.error('Error checking status:', error);
        setUploadStatus(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'failed',
            message: `Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        });
        
        if (statusCheckRef.current) {
          clearInterval(statusCheckRef.current);
          statusCheckRef.current = null;
        }
      }
    }, 2000); // Check every 2 seconds
  };
  
  // Clean up interval on unmount
  React.useEffect(() => {
    return () => {
      if (statusCheckRef.current) {
        clearInterval(statusCheckRef.current);
      }
    };
  }, []);
  
  const resetUploader = () => {
    setUploadStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const getStatusColor = () => {
    if (!uploadStatus) return 'text-gray-400';
    
    switch (uploadStatus.status) {
      case 'uploading':
      case 'processing':
        return 'text-yellow-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };
  
  if (!showUploader && !uploadStatus) {
    return null;
  }
  
  return (
    <div className="mb-4 w-full">
      {showUploader && (
        <div 
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragging ? 'border-neonGreen bg-primary-800' : 'border-gray-600 hover:border-neonGreen'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="application/pdf"
            onChange={handleFileSelect}
          />
          <DocumentArrowUpIcon className="h-8 w-8 mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-300">Drag & drop a PDF file here, or click to select</p>
          <p className="text-xs text-gray-500 mt-1">PDF files only</p>
        </div>
      )}
      
      {uploadStatus && (
        <div className="bg-primary-900 border border-primary-800 rounded-lg p-4 mt-2">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3">
              <DocumentTextIcon className={`h-6 w-6 ${getStatusColor()}`} />
              <div>
                <p className="text-sm font-medium text-gray-200">
                  {uploadStatus.filename || 'PDF Document'}
                </p>
                <p className={`text-xs ${getStatusColor()}`}>
                  {uploadStatus.message}
                  {uploadStatus.numChunks && uploadStatus.status === 'completed' && 
                    ` (${uploadStatus.numChunks} chunks)`}
                </p>
              </div>
            </div>
            <button 
              onClick={resetUploader} 
              className="text-gray-400 hover:text-gray-200"
              title="Remove"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
