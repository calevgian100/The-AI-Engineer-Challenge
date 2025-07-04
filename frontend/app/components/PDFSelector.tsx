import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface PDF {
  file_id: string;
  filename: string;
  num_chunks: number;
}

interface PDFSelectorProps {
  onPDFSelected: (fileId: string) => void;
  currentFileId: string | null;
}

const PDFSelector: React.FC<PDFSelectorProps> = ({ onPDFSelected, currentFileId }) => {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    console.log('PDFSelector mounted, fetching PDFs once on mount...');
    fetchPDFs();
    // No auto-refresh interval
  }, []);

  const fetchPDFs = async () => {
    console.log('PDFSelector component: Fetching PDFs...');
    try {
      setLoading(true);
      const response = await fetch('/api/list-pdfs?source=selector');
      if (!response.ok) {
        throw new Error('Failed to fetch PDFs');
      }
      const data = await response.json();
      setPdfs(data.pdfs || []);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast.error('Failed to load available PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPDF = (fileId: string) => {
    onPDFSelected(fileId);
    setIsOpen(false);
    // Find the selected PDF to show a confirmation
    const selectedPDF = pdfs.find(pdf => pdf.file_id === fileId);
    if (selectedPDF) {
      toast.success(`Selected PDF: ${selectedPDF.filename}`);
    }
  };

  // Find current PDF name if any
  const currentPDF = pdfs.find(pdf => pdf.file_id === currentFileId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary-800 hover:bg-primary-700 text-gray-200 text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
        {currentPDF ? (
          <span className="truncate max-w-[150px]">{currentPDF.filename}</span>
        ) : (
          <span>Select PDF</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 max-h-80 overflow-y-auto bg-primary-900 border border-primary-700 rounded-md shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-gray-400">
              Loading PDFs...
            </div>
          ) : pdfs.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No PDFs available
            </div>
          ) : (
            <ul className="py-1">
              {pdfs.map((pdf) => (
                <li key={pdf.file_id}>
                  <button
                    onClick={() => handleSelectPDF(pdf.file_id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-800 flex items-center justify-between ${pdf.file_id === currentFileId ? 'bg-primary-700 text-neonGreen' : 'text-gray-200'}`}
                  >
                    <span className="truncate">{pdf.filename}</span>
                    <span className="text-xs text-gray-400">{pdf.num_chunks} chunks</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFSelector;
