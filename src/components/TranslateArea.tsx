import { useState, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";

interface TranslateAreaProps {
  sourceText: string;
  translatedText: string;
  onSourceTextChange: (text: string) => void;
  isTranslating: boolean;
  latency?: number;
  engine?: 'ml' | 'ollama';
}

interface ImproveResponse {
  translated_text: string;
}

export default function TranslateArea({ 
  sourceText, 
  translatedText, 
  onSourceTextChange, 
  isTranslating,
  latency,
  engine
}: TranslateAreaProps) {
  const [copied, setCopied] = useState(false);
  const [sourceCopied, setSourceCopied] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improvedText, setImprovedText] = useState("");
  const [showImproved, setShowImproved] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async (text: string, isSource = false) => {
    if (text) {
      await navigator.clipboard.writeText(text);
      if (isSource) {
        setSourceCopied(true);
        setTimeout(() => setSourceCopied(false), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleClear = () => {
    onSourceTextChange('');
  };

  const handleSpeak = (text: string, isSource = false) => {
    if (text && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isSource ? 'auto' : 'ja-JP';
      speechSynthesis.speak(utterance);
    }
  };

  const handleImprove = async (text: string, isSource = false) => {
    if (!text) return;
    
    setIsImproving(true);
    setShowImproved(false);
    
    try {
      // Determine the language for improvement
      const nativeLang = localStorage.getItem('nativeLang') || 'Japanese';
      const improveLanguage = isSource ? 'Auto' : nativeLang;
      
      // Use appropriate language code for improvement
      let languageCode = improveLanguage;
      if (improveLanguage === 'Auto') {
        // For source text, try to detect language or use a default
        languageCode = 'English'; // Default fallback
      }
      
      const response = await invoke<ImproveResponse>('improve_text', {
        text,
        language: languageCode,
      });
      
      const improved = response.translated_text;
      setImprovedText(improved);
      setShowImproved(true);
      
      console.log('✨ Text improved successfully');
    } catch (error) {
      console.error('Failed to improve text:', error);
      // Show user-friendly error message
      setImprovedText('改善処理中にエラーが発生しました。しばらく待ってから再試行してください。');
      setShowImproved(true);
    } finally {
      setIsImproving(false);
    }
  };
  
  const handleUseImproved = () => {
    if (improvedText) {
      onSourceTextChange(improvedText);
      setShowImproved(false);
      setImprovedText("");
    }
  };
  
  const handleCloseImproved = () => {
    setShowImproved(false);
    setImprovedText("");
  };

  // Drag & Drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileProcessing(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileProcessing(files[0]);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileProcessing = async (file: File) => {
    setIsProcessingFile(true);
    
    try {
      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!['txt', 'docx', 'pdf'].includes(fileExtension || '')) {
        throw new Error(`サポートされていないファイル形式です: .${fileExtension}\n\nサポート形式: TXT, DOCX, PDF`);
      }

      let fileContent = '';

      if (fileExtension === 'txt') {
        // For text files, read directly in the browser
        fileContent = await file.text();
      } else {
        // For DOCX and PDF files, use Tauri backend processing
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = btoa(String.fromCharCode(...uint8Array));
        
        try {
          fileContent = await invoke<string>('process_file_content', {
            fileData: base64String,
            fileName: file.name
          });
        } catch (backendError) {
          throw new Error(`${fileExtension?.toUpperCase()} ファイルの処理に失敗しました: ${backendError}`);
        }
      }

      if (fileContent.trim()) {
        onSourceTextChange(fileContent.trim());
        console.log(`✅ File processed successfully: ${file.name} (${fileExtension?.toUpperCase()})`);
      } else {
        throw new Error('ファイルからテキストを抽出できませんでした。');
      }
    } catch (error) {
      console.error('File processing error:', error);
      
      let errorMessage = 'ファイル処理中にエラーが発生しました。';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Show error in source text area temporarily
      onSourceTextChange(`❌ エラー: ${errorMessage}`);
      
      // Clear error after 3 seconds
      setTimeout(() => {
        if (sourceText.startsWith('❌ エラー:')) {
          onSourceTextChange('');
        }
      }, 3000);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
      {/* Hidden file input for click-to-select */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
        {/* 入力エリア */}
        <div className="relative flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <h3 className="text-sm font-medium text-gray-600">翻訳するテキスト</h3>
            {sourceText && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSpeak(sourceText, true)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-all duration-200 cursor-pointer"
                  title="読み上げ"
                >
                  <i className="ri-volume-up-line text-lg"></i>
                </button>
                
                <button
                  onClick={() => handleImprove(sourceText, true)}
                  disabled={isImproving}
                  className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer relative group ${
                    isImproving 
                      ? 'bg-purple-100 text-purple-400 cursor-not-allowed' 
                      : 'hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 text-purple-500'
                  }`}
                  title={isImproving ? "AI改善中..." : "AI自然文変換"}
                >
                  {isImproving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                  ) : (
                    <i className="ri-quill-pen-ai-line text-lg"></i>
                  )}
                  {!isImproving && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse"></div>
                  )}
                </button>
                
                <button
                  onClick={() => handleCopy(sourceText, true)}
                  className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    sourceCopied 
                      ? 'bg-green-100 text-green-600' 
                      : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  title={sourceCopied ? 'コピーしました!' : 'コピー'}
                >
                  <i className={`text-lg ${sourceCopied ? 'ri-check-line' : 'ri-file-copy-line'}`}></i>
                </button>
              </div>
            )}
          </div>
          
          {/* テキストエリア */}
          <div 
            className={`flex-1 p-6 relative bg-white transition-colors duration-200 ${
              isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!sourceText ? (
              <div className="h-full relative">
                {/* 常に表示されるテキストエリア */}
                <textarea
                  value={sourceText}
                  onChange={(e) => onSourceTextChange(e.target.value)}
                  placeholder="翻訳したいテキストを入力またはペーストしてください"
                  className="w-full h-full resize-none border-0 outline-none text-[17px] leading-relaxed text-gray-800 placeholder-gray-400 font-normal bg-transparent"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                />
                
                {/* オーバーレイ表示（テキストが空の時のみ） */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {/* ドラッグ&ドロップエリア */}
                  <div className="w-full max-w-md mx-auto">
                    <div 
                      className={`border-2 border-dashed rounded-2xl p-8 text-center backdrop-blur-sm transition-all duration-200 cursor-pointer pointer-events-auto ${
                        isDragOver 
                          ? 'border-blue-400 bg-blue-50/90 scale-105' 
                          : isProcessingFile
                          ? 'border-purple-300 bg-purple-50/80'
                          : 'border-gray-300 bg-white/80 hover:border-gray-400 hover:bg-gray-50/90'
                      }`}
                      onClick={handleFileClick}
                    >
                      <div className="mb-4">
                        {isProcessingFile ? (
                          <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-500 border-t-transparent mx-auto mb-2"></div>
                        ) : isDragOver ? (
                          <i className="ri-download-cloud-line text-4xl text-blue-500 mb-2 animate-bounce"></i>
                        ) : (
                          <i className="ri-file-text-line text-4xl text-gray-400 mb-2"></i>
                        )}
                      </div>
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        {isProcessingFile 
                          ? 'ファイルを処理中...' 
                          : isDragOver 
                          ? 'ファイルをドロップしてください'
                          : 'テキストをペーストまたは'
                        }
                      </p>
                      {!isProcessingFile && (
                        <>
                          <p className="text-sm text-gray-500 mb-4">
                            {isDragOver ? 'ここにドロップ' : 'ファイルをドラッグ&ドロップまたはクリック'}
                          </p>
                          <div className="flex justify-center items-center space-x-2 text-xs text-gray-400">
                            <span className={`px-2 py-1 rounded transition-colors ${isDragOver ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>TXT</span>
                            <span className={`px-2 py-1 rounded transition-colors opacity-50 ${isDragOver ? 'bg-gray-100 text-gray-400' : 'bg-gray-100'}`}>DOCX*</span>
                            <span className={`px-2 py-1 rounded transition-colors opacity-50 ${isDragOver ? 'bg-gray-100 text-gray-400' : 'bg-gray-100'}`}>PDF*</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">* DOCX・PDF対応は開発中</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 改善されたバナー */}
                  <div className="mt-8 w-full max-w-md mx-auto">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <i className="ri-magic-line text-xl"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">AI搭載翻訳</h4>
                          <p className="text-xs text-blue-100">高精度でスピーディーな翻訳を体験</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={sourceText}
                  onChange={(e) => onSourceTextChange(e.target.value)}
                  placeholder="翻訳したいテキストを入力またはペーストしてください"
                  className="w-full h-full resize-none border-0 outline-none text-[17px] leading-relaxed text-gray-800 placeholder-gray-400 font-normal pr-12"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                />
                
                {/* クリアボタン - 右上に配置 */}
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                  title="クリア"
                >
                  <i className="ri-close-line text-lg text-gray-500"></i>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 翻訳結果エリア */}
        <div className="relative flex flex-col h-full lg:border-l border-gray-200">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-gray-600">翻訳結果</h3>
              {latency && engine && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  engine === 'ml' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  <span>{engine === 'ml' ? '🧠' : '🤖'}</span>
                  <span>{latency}ms</span>
                </div>
              )}
            </div>
            {translatedText && !isTranslating && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSpeak(translatedText)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-all duration-200 cursor-pointer"
                  title="読み上げ"
                >
                  <i className="ri-volume-up-line text-lg"></i>
                </button>
                
                <button
                  onClick={() => handleImprove(translatedText, false)}
                  disabled={isImproving}
                  className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer relative group ${
                    isImproving 
                      ? 'bg-purple-100 text-purple-400 cursor-not-allowed' 
                      : 'hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 text-purple-500'
                  }`}
                  title={isImproving ? "AI改善中..." : "AI自然文変換"}
                >
                  {isImproving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                  ) : (
                    <i className="ri-quill-pen-ai-line text-lg"></i>
                  )}
                  {!isImproving && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse"></div>
                  )}
                </button>
                
                <button
                  onClick={() => handleCopy(translatedText)}
                  className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    copied 
                      ? 'bg-green-100 text-green-600' 
                      : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  title={copied ? 'コピーしました!' : 'コピー'}
                >
                  <i className={`text-lg ${copied ? 'ri-check-line' : 'ri-file-copy-line'}`}></i>
                </button>
              </div>
            )}
          </div>
          
          {/* 結果エリア */}
          <div className="flex-1 p-6 bg-white">
            {isTranslating ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center space-x-3 text-blue-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-sm font-medium">翻訳中...</span>
                </div>
              </div>
            ) : translatedText ? (
              <div 
                className="h-full overflow-y-auto text-[17px] leading-relaxed text-gray-800 font-normal break-words"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                {translatedText}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <i className="ri-translate-2 text-2xl text-gray-300"></i>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">翻訳結果</p>
                  <p className="text-xs text-gray-400">ここに翻訳されたテキストが表示されます</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* AI改善結果モーダル */}
      {showImproved && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <i className="ri-quill-pen-ai-line text-purple-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">AI文章改善</h3>
              </div>
              <button
                onClick={handleCloseImproved}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              >
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>
            
            {/* 改善結果 */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">改善されたテキスト</label>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-gray-800 leading-relaxed">
                  {improvedText}
                </div>
              </div>
            </div>
            
            {/* アクションボタン */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseImproved}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleCopy(improvedText)}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium transition-colors duration-200 flex items-center"
              >
                <i className="ri-file-copy-line mr-2"></i>
                コピー
              </button>
              <button
                onClick={handleUseImproved}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-200 flex items-center"
              >
                <i className="ri-check-line mr-2"></i>
                使用する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}