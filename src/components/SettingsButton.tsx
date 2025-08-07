'use client';

interface SettingsButtonProps {
  onSettingsClick: () => void;
}

export default function SettingsButton({ onSettingsClick }: SettingsButtonProps) {
  return (
    <button
      onClick={onSettingsClick}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
    >
      <i className="ri-settings-3-line text-xl text-gray-600"></i>
    </button>
  );
}