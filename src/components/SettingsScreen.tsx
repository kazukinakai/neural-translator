import { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";

interface SettingsScreenProps {
  onBack: () => void;
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

const aiModels = [
  { id: 'ollama', name: 'Ollama (ローカル)', provider: 'ollama' },
  { id: 'ml', name: 'ML Engine (M4最適化)', provider: 'ml' },
  { id: 'gpt-4', name: 'OpenAI GPT-4', provider: 'openai' },
  { id: 'claude-3', name: 'Anthropic Claude 3', provider: 'anthropic' },
  { id: 'deepl', name: 'DeepL API', provider: 'deepl' },
];

const ollamaModels = [
  { 
    id: 'aya:8b', 
    name: 'Aya 23 8B', 
    size: '4.8GB', 
    installed: true,
    speed: '1.0秒',
    type: '翻訳特化',
    description: '🥇 最速・翻訳専用AI',
    recommended: true,
    useCases: '日常翻訳・リアルタイム翻訳'
  },
  { 
    id: 'qwen2.5:3b', 
    name: 'Qwen 2.5 3B', 
    size: '1.9GB', 
    installed: true,
    speed: '1.7秒',  
    type: '軽量高速',
    description: '🚀 起動最速・省メモリ',
    useCases: 'クイック翻訳・リソース制約下'
  },
  { 
    id: 'llama3.1:8b', 
    name: 'Llama 3.1 8B', 
    size: '4.9GB', 
    installed: true,
    speed: '6.2秒',
    type: '高品質',
    description: '📚 詳細説明・学習向け',
    useCases: '教育目的・詳細説明が必要な場面'
  },
];

const shortcutKeys = [
  { 
    id: 'quick-translate', 
    name: 'クイック起動', 
    defaultKey: '⌘ + C + C',
    description: '⌘ + Cを2回素早く押すとアプリが起動し、クリップボードの内容を翻訳します'
  },
  { 
    id: 'swap', 
    name: '言語・テキスト入れ替え', 
    defaultKey: 'Cmd+Shift+S',
    description: '左右の結果を入れ替えるボタン（真ん中の矢印ボタン）のショートカット'
  },
  { 
    id: 'clear', 
    name: 'テキストクリア', 
    defaultKey: 'Cmd+K',
    description: '入力されたテキストをすべて削除します'
  },
  { 
    id: 'copy', 
    name: '結果をコピー', 
    defaultKey: 'Cmd+C',
    description: '翻訳結果をクリップボードにコピーします'
  },
];

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [userLanguage, setUserLanguage] = useState('Japanese');
  const [selectedModel, setSelectedModel] = useState('ollama');
  const [saveHistory, setSaveHistory] = useState(true);
  const [startupLaunch, setStartupLaunch] = useState(true);
  const [keepInTray, setKeepInTray] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [historyPath, setHistoryPath] = useState('');
  const [shortcuts, setShortcuts] = useState<{[key: string]: string}>({});
  const [apiKeys, setApiKeys] = useState<{[key: string]: string}>({});
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState('llama3.1:8b');
  const [downloadingModels, setDownloadingModels] = useState<{[key: string]: boolean}>({});
  const [systemMetrics, setSystemMetrics] = useState<any>(null);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('nativeLang') || 'Japanese';
    const savedModel = localStorage.getItem('aiModel') || 'ollama';
    const savedHistory = localStorage.getItem('saveHistory') !== 'false';
    const savedStartupLaunch = localStorage.getItem('startupLaunch') !== 'false';
    const savedKeepInTray = localStorage.getItem('keepInTray') !== 'false';
    const savedAutoTranslate = localStorage.getItem('autoTranslate') !== 'false';
    const savedHistoryPath = localStorage.getItem('historyPath') || getDefaultHistoryPath();
    const savedShortcuts = JSON.parse(localStorage.getItem('shortcuts') || '{}');
    const savedApiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
    const savedOllamaModel = localStorage.getItem('selectedOllamaModel') || 'aya:8b';

    setUserLanguage(savedLanguage);
    setSelectedModel(savedModel);
    setSaveHistory(savedHistory);
    setStartupLaunch(savedStartupLaunch);
    setKeepInTray(savedKeepInTray);
    setAutoTranslate(savedAutoTranslate);
    setHistoryPath(savedHistoryPath);
    setSelectedOllamaModel(savedOllamaModel);
    
    const defaultShortcuts = shortcutKeys.reduce((acc, key) => {
      acc[key.id] = savedShortcuts[key.id] || key.defaultKey;
      return acc;
    }, {} as {[key: string]: string});
    setShortcuts(defaultShortcuts);
    setApiKeys(savedApiKeys);
    
    // Start metrics collection
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 2000); // Update every 2 seconds
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      const metrics = await invoke('get_system_metrics');
      setSystemMetrics(metrics);
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    }
  };

  const getDefaultHistoryPath = () => {
    return '~/Documents/NeuraL/';
  };

  const handleLanguageChange = (langCode: string) => {
    setUserLanguage(langCode);
    localStorage.setItem('nativeLang', langCode);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('aiModel', modelId);
  };

  const handleOllamaModelChange = (modelId: string) => {
    setSelectedOllamaModel(modelId);
    localStorage.setItem('selectedOllamaModel', modelId);
  };

  const handleHistoryToggle = (enabled: boolean) => {
    setSaveHistory(enabled);
    localStorage.setItem('saveHistory', enabled.toString());
  };

  const handleStartupToggle = (enabled: boolean) => {
    setStartupLaunch(enabled);
    localStorage.setItem('startupLaunch', enabled.toString());
  };

  const handleTrayToggle = (enabled: boolean) => {
    setKeepInTray(enabled);
    localStorage.setItem('keepInTray', enabled.toString());
  };

  const handleAutoTranslateToggle = (enabled: boolean) => {
    setAutoTranslate(enabled);
    localStorage.setItem('autoTranslate', enabled.toString());
  };

  const handleHistoryPathChange = (path: string) => {
    setHistoryPath(path);
    localStorage.setItem('historyPath', path);
  };

  const selectHistoryFolder = async () => {
    // Tauriでフォルダ選択ダイアログを開く
    try {
      // TODO: Tauri APIを使用してフォルダ選択を実装
      const selectedPath = prompt('保存先フォルダを入力してください:', historyPath);
      if (selectedPath) {
        handleHistoryPathChange(selectedPath);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleShortcutChange = (shortcutId: string, newKey: string) => {
    const updatedShortcuts = { ...shortcuts, [shortcutId]: newKey };
    setShortcuts(updatedShortcuts);
    localStorage.setItem('shortcuts', JSON.stringify(updatedShortcuts));
    setEditingShortcut(null);
  };

  const handleApiKeyChange = (provider: string, key: string) => {
    const updatedApiKeys = { ...apiKeys, [provider]: key };
    setApiKeys(updatedApiKeys);
    localStorage.setItem('apiKeys', JSON.stringify(updatedApiKeys));
  };

  const downloadOllamaModel = async (modelId: string) => {
    setDownloadingModels(prev => ({ ...prev, [modelId]: true }));
    
    try {
      // Ollama APIを使用してモデルをダウンロード
      await invoke('download_ollama_model', { modelId });
      
      // ダウンロード完了後の処理
      setDownloadingModels(prev => ({ ...prev, [modelId]: false }));
    } catch (error) {
      console.error('Failed to download model:', error);
      setDownloadingModels(prev => ({ ...prev, [modelId]: false }));
    }
  };

  return (
    <div className="w-full h-screen px-4 py-4 flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            title="設定から戻る"
            className="p-2 rounded-full hover:bg-gray-200 transition-colors duration-200 cursor-pointer mr-3"
          >
            <i className="ri-arrow-left-line text-xl text-gray-600"></i>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">設定</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* 言語設定 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="ri-translate-2 text-blue-600 mr-2"></i>
              言語設定
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">母国語</label>
              <select
                value={userLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AIモデル設定 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="ri-brain-line text-purple-600 mr-2"></i>
              AIモデル設定
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">使用するモデル</label>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                >
                  {aiModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ollamaモデル一覧 */}
              {selectedModel === 'ollama' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <i className="ri-computer-line text-gray-600 mr-2"></i>
                      翻訳モデル選択
                    </h3>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <i className="ri-information-line text-blue-600"></i>
                      <div className="text-xs text-blue-700">
                        <span className="font-medium">性能実測値:</span> M4 Macでの翻訳速度測定結果に基づいて表示しています。
                        GPTranslateより2-5倍高速な完全ローカル翻訳を実現。
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {ollamaModels.map((model) => (
                      <div key={model.id} className={`relative p-4 bg-white rounded-lg border transition-all duration-200 ${
                        selectedOllamaModel === model.id ? 'border-blue-500 shadow-md' : 'border-gray-200'
                      } ${model.recommended ? 'ring-2 ring-yellow-200' : ''}`}>
                        {model.recommended && (
                          <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                            <span>👑</span>
                            <span>推奨</span>
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <input
                              type="radio"
                              name="ollama-model"
                              value={model.id}
                              checked={selectedOllamaModel === model.id}
                              onChange={(e) => handleOllamaModelChange(e.target.value)}
                              className="w-4 h-4 text-blue-600 mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-800">{model.name}</span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  model.type === '翻訳特化' ? 'bg-purple-100 text-purple-700' :
                                  model.type === '軽量高速' ? 'bg-blue-100 text-blue-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {model.type}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-1">
                                {model.description}
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <i className="ri-timer-line mr-1"></i>
                                  <span className="font-medium">{model.speed}</span>
                                </span>
                                <span className="flex items-center">
                                  <i className="ri-hard-drive-line mr-1"></i>
                                  {model.size}
                                </span>
                                {model.installed && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                    インストール済み
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 text-xs text-gray-400">
                                <span className="font-medium">用途:</span> {model.useCases}
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            {model.installed ? (
                              <button className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed">
                                <i className="ri-check-line mr-1"></i>
                                利用可能
                              </button>
                            ) : downloadingModels[model.id] ? (
                              <button className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-sm cursor-not-allowed">
                                <i className="ri-download-line mr-1 animate-bounce"></i>
                                取得中...
                              </button>
                            ) : (
                              <button
                                onClick={() => downloadOllamaModel(model.id)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                              >
                                <i className="ri-download-line mr-1"></i>
                                取得
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* APIキー設定 - アコーディオン */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() => setShowApiKeys(!showApiKeys)}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200"
            >
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <i className="ri-key-line text-green-600 mr-2"></i>
                APIキー設定
              </h2>
              <i className={`ri-arrow-down-s-line text-xl text-gray-400 transition-transform duration-200 ${showApiKeys ? 'rotate-180' : ''}`}></i>
            </button>
            
            {showApiKeys && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI API Key</label>
                  <input
                    type="password"
                    value={apiKeys.openai || ''}
                    onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                    placeholder="sk-..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Anthropic API Key</label>
                  <input
                    type="password"
                    value={apiKeys.anthropic || ''}
                    onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">DeepL API Key</label>
                  <input
                    type="password"
                    value={apiKeys.deepl || ''}
                    onChange={(e) => handleApiKeyChange('deepl', e.target.value)}
                    placeholder="Your DeepL API key..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ショートカットキー設定 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="ri-keyboard-line text-orange-600 mr-2"></i>
              ショートカットキー
            </h2>
            <div className="space-y-4">
              {shortcutKeys.map((shortcut) => (
                <div key={shortcut.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium">{shortcut.name}</span>
                    {editingShortcut === shortcut.id ? (
                      <input
                        type="text"
                        value={shortcuts[shortcut.id]}
                        onChange={(e) => handleShortcutChange(shortcut.id, e.target.value)}
                        onBlur={() => setEditingShortcut(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingShortcut(null)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setEditingShortcut(shortcut.id)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                      >
                        {shortcuts[shortcut.id]}
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {shortcut.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* アプリケーション設定 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="ri-macbook-line text-indigo-600 mr-2"></i>
              アプリケーション設定
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-700 font-medium">クリップボードの自動翻訳</div>
                  <div className="text-sm text-gray-500">クリップボードの内容を自動で翻訳します</div>
                </div>
                <button
                  onClick={() => handleAutoTranslateToggle(!autoTranslate)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                    autoTranslate ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      autoTranslate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-700 font-medium">スタートアップ起動</div>
                  <div className="text-sm text-gray-500">システム起動時にアプリを自動起動します</div>
                </div>
                <button
                  onClick={() => handleStartupToggle(!startupLaunch)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                    startupLaunch ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      startupLaunch ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-700 font-medium">アプリを閉じるときの挙動</div>
                  <div className="text-sm text-gray-500">アプリを閉じるときにシステムトレイに常駐します</div>
                </div>
                <button
                  onClick={() => handleTrayToggle(!keepInTray)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                    keepInTray ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      keepInTray ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* その他設定 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="ri-settings-line text-gray-600 mr-2"></i>
              その他
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-700 font-medium">翻訳履歴を保存</div>
                  <div className="text-sm text-gray-500">翻訳履歴をローカルに保存します</div>
                </div>
                <button
                  onClick={() => handleHistoryToggle(!saveHistory)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                    saveHistory ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      saveHistory ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {saveHistory && (
                <div className="mt-3 pl-4 border-l-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">保存先ディレクトリ</label>
                    <button
                      onClick={selectHistoryFolder}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-folder-open-line mr-1"></i>
                      変更
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md font-mono">
                    {historyPath}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* パフォーマンスモニター */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="ri-dashboard-line text-red-600 mr-2"></i>
              パフォーマンスモニター
            </h2>
            {systemMetrics ? (
              <div className="space-y-4">
                {/* メモリ使用状況 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">メモリ使用量</span>
                    <span className="text-sm text-gray-600">
                      {Math.round(systemMetrics.memory.used_mb / 1024 * 10) / 10}GB / {Math.round(systemMetrics.memory.total_mb / 1024)}GB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        systemMetrics.memory.usage_percent > 80 ? 'bg-red-500' :
                        systemMetrics.memory.usage_percent > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${systemMetrics.memory.usage_percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">使用率: {systemMetrics.memory.usage_percent}%</span>
                    <span className="text-xs text-gray-500">
                      Ollama: {systemMetrics.memory.ollama_memory_mb}MB
                    </span>
                  </div>
                </div>

                {/* CPU使用状況 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">CPU使用率</span>
                    <span className="text-sm text-gray-600">
                      {Math.round(systemMetrics.cpu.usage_percent)}% ({systemMetrics.cpu.count}コア)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        systemMetrics.cpu.usage_percent > 80 ? 'bg-red-500' :
                        systemMetrics.cpu.usage_percent > 60 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(systemMetrics.cpu.usage_percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* GPU状態 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <i className="ri-cpu-line text-purple-600 mr-2"></i>
                    <span className="text-sm font-medium text-gray-700">GPU状態</span>
                  </div>
                  <div className={`flex items-center ${systemMetrics.gpu.available ? 'text-green-600' : 'text-gray-400'}`}>
                    {systemMetrics.gpu.available ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        <span className="text-sm font-medium">Metal GPU 有効</span>
                      </>
                    ) : (
                      <span className="text-sm">利用不可</span>
                    )}
                  </div>
                </div>

                {/* システム情報 */}
                <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-200">
                  <p>OS: {systemMetrics.system.os === 'macos' ? 'macOS' : systemMetrics.system.os}</p>
                  <p>アーキテクチャ: {systemMetrics.system.arch}</p>
                  <p>アプリメモリ: {systemMetrics.memory.app_memory_mb}MB</p>
                </div>

                {/* モデル別メモリ予測 */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-xs font-medium text-blue-700 mb-2">モデル別メモリ使用予測</h4>
                  <div className="space-y-1">
                    {ollamaModels.map((model) => (
                      <div key={model.id} className="flex justify-between text-xs">
                        <span className="text-gray-600">{model.name}</span>
                        <span className={`font-medium ${
                          selectedOllamaModel === model.id ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {model.size}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="text-center text-gray-400">
                  <i className="ri-loader-4-line text-2xl animate-spin mb-2"></i>
                  <p className="text-sm">メトリクス取得中...</p>
                </div>
              </div>
            )}
          </div>

          {/* アプリケーション情報 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="ri-information-line text-gray-600 mr-2"></i>
              アプリケーション情報
            </h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>バージョン: 1.0.0</p>
              <p>© 2024 NeuraL Translator</p>
              <p className="text-xs text-gray-400">M4 Mac最適化版</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}