import { useState, useRef, useEffect } from 'react';

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  languages: Language[];
  label: string;
}

export default function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange, 
  languages, 
  label 
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedLang = languages.find(lang => lang.code === selectedLanguage);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-48 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 cursor-pointer whitespace-nowrap"
      >
        <div className="flex items-center">
          <span className="text-lg mr-2">{selectedLang?.flag || '🌐'}</span>
          <span className="text-gray-800">{selectedLang?.name || '言語を選択'}</span>
        </div>
        <i className={`ri-arrow-down-s-line transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => {
                onLanguageChange(language.code);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-4 py-3 hover:bg-gray-50 transition-colors duration-200 cursor-pointer whitespace-nowrap"
            >
              <span className="text-lg mr-3">{language.flag}</span>
              <span className="text-gray-800">{language.name}</span>
              {selectedLanguage === language.code && (
                <i className="ri-check-line text-blue-500 ml-auto"></i>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}