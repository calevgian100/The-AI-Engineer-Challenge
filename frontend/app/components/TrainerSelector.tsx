import React, { useState, useRef, useEffect } from 'react';
import { TrophyIcon, AcademicCapIcon, FireIcon } from '@heroicons/react/24/solid';

interface TrainerOption {
  id: string;
  name: string;
}

interface TrainerSelectorProps {
  trainers: Record<string, { name: string; message: string }>;
  currentTrainer: string;
  onTrainerChange: (trainerId: string) => void;
}

const TrainerSelector: React.FC<TrainerSelectorProps> = ({
  trainers,
  currentTrainer,
  onTrainerChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get trainer descriptions for tooltips
  const getTrainerDescription = (trainerId: string): string => {
    switch(trainerId) {
      case 'expert':
        return 'Elite coach with 15+ years of experience';
      case 'standard':
        return 'Regular coach with 5 years of experience';
      case 'beginner':
        return 'Newly certified trainer with basic knowledge';
      default:
        return '';
    }
  };

  // Handle trainer selection
  const handleSelect = (trainerId: string) => {
    onTrainerChange(trainerId);
    setIsOpen(false);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    // Position the dropdown menu when it opens
    function positionDropdown() {
      if (isOpen && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const dropdownMenu = document.querySelector('.trainer-dropdown-menu') as HTMLElement;
        if (dropdownMenu) {
          dropdownMenu.style.top = `${rect.bottom + window.scrollY}px`;
          dropdownMenu.style.left = `${rect.left + window.scrollX}px`;
          dropdownMenu.style.width = `${rect.width}px`;
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    
    // Position dropdown when it opens
    if (isOpen) {
      positionDropdown();
      // Also position on resize
      window.addEventListener('resize', positionDropdown);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', positionDropdown);
    };
  }, [isOpen]);

  // Get trainer icon based on level
  const getTrainerIcon = (trainerId: string) => {
    switch(trainerId) {
      case 'expert':
        return <TrophyIcon className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_3px_rgba(234,179,8,0.5)]" />;
      case 'standard':
        return <AcademicCapIcon className="h-5 w-5 text-gray-300 drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]" />;
      case 'beginner':
        return <FireIcon className="h-5 w-5 text-neonGreen drop-shadow-[0_0_3px_rgba(57,255,20,0.5)]" />;
      default:
        return <AcademicCapIcon className="h-5 w-5 text-neonGreen" />;
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="flex items-center space-x-3 bg-black bg-opacity-80 px-5 py-2.5 rounded-lg border border-neonGreen/30 shadow-[0_0_10px_rgba(57,255,20,0.15)] transition-all duration-300 hover:border-neonGreen/40 hover:shadow-[0_0_15px_rgba(57,255,20,0.25)] w-[380px] relative z-30"
    >
      {getTrainerIcon(currentTrainer)}
      <div className="flex flex-col relative w-full text-left">
        <label className="text-neonGreen text-xs font-medium">
          SELECT YOUR TRAINER
        </label>
        
        {/* Custom dropdown trigger */}
        <div 
          onClick={() => setIsOpen(!isOpen)} 
          className="flex items-center justify-between cursor-pointer py-1 w-full text-left"
        >
          <span className="text-white text-sm font-semibold w-32 inline-block">
            {trainers[currentTrainer].name}
          </span>
          <div className="flex items-center ml-3">
            <svg 
              className={`h-4 w-4 text-neonGreen transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {/* Dropdown menu */}
        {isOpen && (
          <div className="trainer-dropdown-menu fixed mt-2 w-full min-w-[240px] bg-black border border-neonGreen/50 rounded-lg shadow-[0_0_15px_rgba(57,255,20,0.25)] z-[9999] overflow-hidden text-left" style={{top: 'auto', left: 'auto', transform: 'none'}}>
            {Object.entries(trainers).map(([id, { name }]) => (
              <div 
                key={id} 
                onClick={() => handleSelect(id)}
                className={`px-4 py-3 cursor-pointer hover:bg-neonGreen/10 transition-all duration-200 ${currentTrainer === id ? 'bg-neonGreen/20 text-neonGreen font-medium' : 'text-white hover:text-neonGreen/90'} border-b border-neonGreen/10 last:border-b-0`}
              >
                <div className="flex items-center">
                  {id === 'expert' && <TrophyIcon className={`h-4 w-4 mr-2 text-yellow-400 ${currentTrainer === id ? 'drop-shadow-[0_0_3px_rgba(234,179,8,0.5)]' : ''}`} />}
                  {id === 'standard' && <AcademicCapIcon className={`h-4 w-4 mr-2 text-gray-300 ${currentTrainer === id ? 'drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]' : ''}`} />}
                  {id === 'beginner' && <FireIcon className={`h-4 w-4 mr-2 text-neonGreen ${currentTrainer === id ? 'drop-shadow-[0_0_3px_rgba(57,255,20,0.5)]' : ''}`} />}
                  {name}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-gray-400 mt-0.5">{getTrainerDescription(currentTrainer)}</div>
      </div>
    </div>
  );
};

export default TrainerSelector;
