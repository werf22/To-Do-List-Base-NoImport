import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';

interface SelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter((option) => 
        option.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  // Calculate positioning when dropdown opens
  useEffect(() => {
    if (isOpen && containerRef.current && dropdownRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - containerRect.bottom;
      const spaceAbove = containerRect.top;
      const dropdownHeight = Math.min(filteredOptions.length * 36 + 60, 300); // Estimate height
      
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [isOpen, filteredOptions.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Select an option
  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      
      {/* Selected value display */}
      <div
        className="h-10 px-3 py-2 border border-gray-300 rounded-md bg-white w-full cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value ? (
          <span>{value}</span>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </div>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute z-20 w-full border border-gray-300 rounded-md bg-white shadow-lg max-h-60 overflow-auto ${
            position === 'top' 
              ? 'bottom-full mb-1' 
              : 'top-full mt-1'
          }`}
        >
          {/* Search input */}
          <div className="sticky top-0 bg-white border-b border-gray-300 p-2">
            <input
              type="text"
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full p-2 border border-gray-300 rounded-md"
              autoFocus
            />
          </div>
          
          {/* Options list */}
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-2 px-3 text-gray-500">No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <div 
                  key={option}
                  className={`py-2 px-3 hover:bg-gray-100 cursor-pointer ${
                    option === value ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                  onClick={() => selectOption(option)}
                >
                  {option}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Select;
