import { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";

interface HistoryScreenProps {
  onBack: () => void;
  onLoadTranslation: (sourceText: string) => void;
}

interface TranslationHistory {
  id: string;
  timestamp: number;
  source_text: string;
  translated_text: string;
  from_language: string;
  to_language: string;
  engine: string;
  latency_ms?: number;
}

interface HistoryStats {
  total_translations: number;
  created_at?: number;
  updated_at?: number;
  version?: string;
}

export default function HistoryScreen({ onBack, onLoadTranslation }: HistoryScreenProps) {
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [stats, setStats] = useState<HistoryStats>({ total_translations: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const historyPath = localStorage.getItem('historyPath') || undefined;
      const translations = await invoke<TranslationHistory[]>('load_translation_history', {
        historyPath,
        limit: 100, // Load last 100 translations
      });
      setHistory(translations);
    } catch (error) {
      console.error('Failed to load translation history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const historyPath = localStorage.getItem('historyPath') || undefined;
      const historyStats = await invoke<HistoryStats>('get_history_stats', {
        historyPath,
      });
      setStats(historyStats);
    } catch (error) {
      console.error('Failed to load history stats:', error);
    }
  };

  const handleClearHistory = async () => {
    try {
      const historyPath = localStorage.getItem('historyPath') || undefined;
      await invoke('clear_translation_history', { historyPath });
      setHistory([]);
      setStats({ total_translations: 0 });
      setShowClearConfirm(false);
      console.log('🗑️ Translation history cleared');
    } catch (error) {
      console.error('Failed to clear translation history:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLanguageFlag = (language: string) => {
    const flags: { [key: string]: string } = {
      'Japanese': '🇯🇵',
      'English': '🇺🇸',
      'Chinese': '🇨🇳',
      'Korean': '🇰🇷',
      'Spanish': '🇪🇸',
      'French': '🇫🇷',
      'German': '🇩🇪',
      'Auto': '🌐',
    };
    return flags[language] || '🌍';
  };

  const getEngineIcon = (engine: string) => {
    return engine === 'ml' ? '🧠' : '🤖';
  };

  const handleEntryClick = (entry: TranslationHistory) => {
    setSelectedEntry(selectedEntry === entry.id ? null : entry.id);
  };

  const handleLoadTranslation = (sourceText: string) => {
    onLoadTranslation(sourceText);
    onBack();
  };

  return (
    <div className="w-full h-screen px-4 py-4 flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors duration-200 cursor-pointer mr-3"
          >
            <i className="ri-arrow-left-line text-xl text-gray-600"></i>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">翻訳履歴</h1>
        </div>
        
        {history.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 cursor-pointer flex items-center"
          >
            <i className="ri-delete-bin-line mr-2"></i>
            履歴をクリア
          </button>
        )}
      </div>

      {/* 統計情報 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <i className="ri-bar-chart-line text-blue-600 mr-2"></i>
          統計情報
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total_translations}</div>
            <div className="text-sm text-gray-500">総翻訳数</div>
          </div>
          {stats.created_at && (
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800">{formatDate(stats.created_at)}</div>
              <div className="text-sm text-gray-500">開始日</div>
            </div>
          )}
          {stats.updated_at && (
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800">{formatDate(stats.updated_at)}</div>
              <div className="text-sm text-gray-500">最終更新</div>
            </div>
          )}
        </div>
      </div>

      {/* 履歴リスト */}
      <div className="flex-1 overflow-hidden">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <i className="ri-history-line text-green-600 mr-2"></i>
              履歴 ({history.length})
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center space-x-3 text-blue-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-sm font-medium">履歴を読み込み中...</span>
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <i className="ri-history-line text-2xl text-gray-300"></i>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">履歴がありません</p>
                  <p className="text-xs text-gray-400">翻訳を実行すると履歴が保存されます</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`border border-gray-200 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedEntry === entry.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleEntryClick(entry)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{formatDate(entry.timestamp)}</span>
                        <div className="flex items-center space-x-1">
                          <span>{getLanguageFlag(entry.from_language)}</span>
                          <i className="ri-arrow-right-line text-xs text-gray-400"></i>
                          <span>{getLanguageFlag(entry.to_language)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{getEngineIcon(entry.engine)}</span>
                          <span className="text-xs text-gray-500">{entry.engine}</span>
                          {entry.latency_ms && (
                            <span className="text-xs text-gray-400">({entry.latency_ms}ms)</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadTranslation(entry.source_text);
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                      >
                        <i className="ri-refresh-line mr-1"></i>
                        再翻訳
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">原文</div>
                        <div className="text-sm text-gray-800 line-clamp-2">{entry.source_text}</div>
                      </div>
                      
                      {selectedEntry === entry.id && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">翻訳結果</div>
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                            {entry.translated_text}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* クリア確認モーダル */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <i className="ri-delete-bin-line text-red-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">履歴をクリア</h3>
              </div>
              <p className="text-gray-600 mb-6">
                すべての翻訳履歴を削除します。この操作は取り消すことができません。
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors duration-200 flex items-center"
                >
                  <i className="ri-delete-bin-line mr-2"></i>
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}