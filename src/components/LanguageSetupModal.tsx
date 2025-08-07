import { useState } from 'react';

interface LanguageSetupModalProps {
  onLanguageSelect: (language: string) => void;
}

const languages = [
  { code: 'Japanese', name: '日本語', flag: '🇯🇵' },
  { code: 'English', name: 'English', flag: '🇺🇸' },
  { code: 'Chinese', name: '中文', flag: '🇨🇳' },
  { code: 'Korean', name: '한국어', flag: '🇰🇷' },
  { code: 'Spanish', name: 'Español', flag: '🇪🇸' },
  { code: 'French', name: 'Français', flag: '🇫🇷' },
  { code: 'German', name: 'Deutsch', flag: '🇩🇪' },
];

export default function LanguageSetupModal({ onLanguageSelect }: LanguageSetupModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('Japanese');

  const handleConfirm = () => {
    onLanguageSelect(selectedLanguage);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-translate-2 text-2xl text-blue-600"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome to NeuraL Translator
          </h2>
          <p className="text-gray-600">
            Please select your native language for the best translation experience
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => setSelectedLanguage(language.code)}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer whitespace-nowrap ${
                selectedLanguage === language.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{language.flag}</span>
                <span className="text-lg font-medium text-gray-800">
                  {language.name}
                </span>
              </div>
              {selectedLanguage === language.code && (
                <i className="ri-check-line text-xl text-blue-500"></i>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 cursor-pointer whitespace-nowrap"
        >
          設定を完了
        </button>
      </div>
    </div>
  );
}