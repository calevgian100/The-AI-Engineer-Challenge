import React from 'react';
import { UserCircleIcon } from '@heroicons/react/24/solid';

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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTrainerChange(e.target.value);
  };

  return (
    <div className="flex items-center space-x-3 bg-black bg-opacity-60 px-4 py-2 rounded-full border border-neonGreen/30 shadow-[0_0_10px_rgba(57,255,20,0.15)] transition-all duration-300 hover:border-neonGreen/50 hover:shadow-[0_0_15px_rgba(57,255,20,0.25)]">
      <UserCircleIcon className="h-5 w-5 text-neonGreen" />
      <div className="flex flex-col">
        <label htmlFor="trainer-select" className="text-neonGreen text-xs font-medium">
          SELECT YOUR TRAINER
        </label>
        <div className="relative">
          <select
            id="trainer-select"
            value={currentTrainer}
            onChange={handleChange}
            className="appearance-none bg-transparent text-white border-none pr-8 py-0 focus:outline-none text-sm font-semibold"
            title={getTrainerDescription(currentTrainer)}
          >
            {Object.entries(trainers).map(([id, { name }]) => (
              <option key={id} value={id} className="bg-primary-900 text-white">
                {name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
            <svg className="h-4 w-4 text-neonGreen" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{getTrainerDescription(currentTrainer)}</div>
      </div>
    </div>
  );
};

export default TrainerSelector;
