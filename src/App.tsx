import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import LanguageSelector from "./components/LanguageSelector";
import TranslateArea from "./components/TranslateArea";
import SettingsButton from "./components/SettingsButton";
import SettingsScreen from "./components/SettingsScreen";
import LanguageSetupModal from "./components/LanguageSetupModal";
import HistoryScreen from "./components/HistoryScreen";

interface TranslateResponse {
  translated_text: string;
}

interface DetectLanguageResponse {
  language: string;
}

// ML Engine interfaces (M4 Mac optimized)
interface MLTranslateResponse {
  translated_text: string;
  confidence_score: number;
  latency_ms: number;
}

interface MLDetectLanguageResponse {
  language: string;
  confidence: number;
  latency_ms: number;
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

function App() {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [fromLang, setFromLang] = useState("Auto");
  const [toLang, setToLang] = useState(() => {
    return localStorage.getItem("nativeLang") || "Japanese";
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [isHealthy, setIsHealthy] = useState(false);
  const [mlEngineHealthy, setMlEngineHealthy] = useState(false);
  const [useMLEngine, setUseMLEngine] = useState(false); // Default to Ollama until ML engine is implemented
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [lastClipboard, setLastClipboard] = useState("");
  const [translationCache] = useState<Map<string, string>>(new Map());
  const [lastTranslationLatency, setLastTranslationLatency] = useState<number | undefined>();
  const [lastUsedEngine, setLastUsedEngine] = useState<'ml' | 'ollama' | undefined>();
  const [showLanguageSetup, setShowLanguageSetup] = useState(() => {
    return !localStorage.getItem("nativeLang");
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    checkOllamaHealth();
    checkMLHealth();
    
    // Listen for global shortcut triggers
    const unlistenTranslate = listen('translate-shortcut', async () => {
      try {
        const clipboardText = await invoke<string>("get_clipboard_text");
        if (clipboardText) {
          setInputText(clipboardText);
          // Auto-translate clipboard content
          translateText(clipboardText);
        }
      } catch (error) {
        console.error("Failed to get clipboard text:", error);
      }
    });
    
    const unlistenLanguageSwap = listen('language-swap', () => {
      console.log("🔄 Language swap shortcut triggered");
      switchLanguages();
    });
    
    const unlistenClearText = listen('clear-text', () => {
      console.log("🗑️ Clear text shortcut triggered");
      setInputText('');
    });
    
    const unlistenCopyResult = listen('copy-result', async () => {
      console.log("📋 Copy result shortcut triggered");
      if (translatedText) {
        try {
          await navigator.clipboard.writeText(translatedText);
          console.log("✅ Translation result copied to clipboard");
        } catch (error) {
          console.error("Failed to copy to clipboard:", error);
        }
      }
    });
    
    return () => {
      unlistenTranslate.then(fn => fn());
      unlistenLanguageSwap.then(fn => fn());
      unlistenClearText.then(fn => fn());
      unlistenCopyResult.then(fn => fn());
    };
  }, [fromLang, toLang, translatedText]);

  // Automatic translation on input change
  useEffect(() => {
    if (!inputText.trim()) {
      setTranslatedText("");
      return;
    }

    const timeoutId = setTimeout(() => {
      translateText(inputText);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [inputText]);

  // Clipboard monitoring
  useEffect(() => {
    if (!autoTranslate) return;

    const checkClipboard = async () => {
      try {
        const clipboardText = await invoke<string>("get_clipboard_text");
        if (clipboardText && clipboardText !== lastClipboard && clipboardText.trim()) {
          setLastClipboard(clipboardText);
          setInputText(clipboardText);
        }
      } catch (error) {
        console.error("Failed to check clipboard:", error);
      }
    };

    const interval = setInterval(checkClipboard, 1000);
    return () => clearInterval(interval);
  }, [autoTranslate, lastClipboard]);

  async function checkOllamaHealth() {
    try {
      const healthy = await invoke<boolean>("check_ollama_health");
      setIsHealthy(healthy);
    } catch (error) {
      console.error("Failed to check Ollama health:", error);
      setIsHealthy(false);
    }
  }

  async function checkMLHealth() {
    try {
      const healthy = await invoke<boolean>("check_ml_health");
      setMlEngineHealthy(healthy);
      console.log("ML Engine status:", healthy ? "✅ Ready" : "❌ Not available");
    } catch (error) {
      console.error("Failed to check ML health:", error);
      setMlEngineHealthy(false);
    }
  }

  async function detectLanguageAndTranslate(text: string) {
    if (!text.trim()) return;
    
    // Declare variables outside try block for error handling access
    let actualFromLang = fromLang;
    let actualToLang = toLang;
    let cacheKey = "";
    
    try {
      // Choose the best available engine for language detection
      let detectResponse: DetectLanguageResponse | MLDetectLanguageResponse;
      
      if (useMLEngine && mlEngineHealthy) {
        console.log("🧠 Using ML Engine for language detection");
        detectResponse = await invoke<MLDetectLanguageResponse>("ml_detect_language", { text });
      } else {
        console.log("🤖 Using Ollama for language detection");
        detectResponse = await invoke<DetectLanguageResponse>("detect_language", { text });
      }
      
      const detectedLang = detectResponse.language;
      
      // Update from language if it was Auto
      if (fromLang === "Auto") {
        setFromLang(detectedLang);
      }
      
      // Smart language switching based on native language
      const nativeLang = localStorage.getItem("nativeLang") || "Japanese";
      actualFromLang = detectedLang;
      actualToLang = toLang;
      
      // If auto-detecting, determine the target language intelligently
      if (fromLang === "Auto") {
        if (detectedLang === nativeLang) {
          // If detected language is native language, translate to English
          actualToLang = "English";
        } else if (detectedLang === "English") {
          // If detected language is English, translate to native language
          actualToLang = nativeLang;
        } else {
          // For other languages, translate to native language
          actualToLang = nativeLang;
        }
        setToLang(actualToLang);
      } else if (detectedLang === toLang) {
        // Manual language selection but same source and target
        if (detectedLang === nativeLang) {
          actualToLang = "English";
        } else {
          actualToLang = nativeLang;
        }
        setToLang(actualToLang);
      }
      
      // Check cache first
      cacheKey = `${text}|${actualFromLang}|${actualToLang}`;
      const cached = translationCache.get(cacheKey);
      if (cached) {
        setTranslatedText(cached);
        return;
      }
      
      setIsTranslating(true);
      
      // Choose the best available engine for translation
      let translatedTextResult: string;
      let latency = 0;
      
      if (useMLEngine && mlEngineHealthy) {
        console.log("🧠 Using ML Engine for translation");
        const mlResponse = await invoke<MLTranslateResponse>("ml_translate", {
          text,
          fromLang: actualFromLang,
          toLang: actualToLang,
        });
        translatedTextResult = mlResponse.translated_text;
        latency = mlResponse.latency_ms;
        setLastTranslationLatency(latency);
        setLastUsedEngine('ml');
        console.log(`⚡ ML translation completed in ${latency}ms`);
      } else {
        console.log("🤖 Using Ollama for translation");
        const startTime = performance.now();
        const response = await invoke<TranslateResponse>("translate", {
          text,
          fromLang: actualFromLang,
          toLang: actualToLang,
        });
        translatedTextResult = response.translated_text;
        latency = Math.round(performance.now() - startTime);
        setLastTranslationLatency(latency);
        setLastUsedEngine('ollama');
        console.log(`🤖 Ollama translation completed in ${latency}ms`);
      }
      
      setTranslatedText(translatedTextResult);
      
      // Cache the translation
      translationCache.set(cacheKey, translatedTextResult);
      
      // Save to history if enabled
      const saveHistory = localStorage.getItem('saveHistory') !== 'false';
      if (saveHistory && text.trim() && translatedTextResult.trim()) {
        try {
          const historyPath = localStorage.getItem('historyPath') || undefined;
          await invoke('save_translation_history', {
            sourceText: text,
            translatedText: translatedTextResult,
            fromLanguage: actualFromLang,
            toLanguage: actualToLang,
            engine: useMLEngine && mlEngineHealthy ? 'ml' : 'ollama',
            latencyMs: latency > 0 ? latency : undefined,
            historyPath,
          });
          console.log('📚 Translation saved to history');
        } catch (error) {
          console.error('Failed to save translation history:', error);
        }
      }
      
      // Limit cache size
      if (translationCache.size > 100) {
        const firstKey = translationCache.keys().next().value;
        if (firstKey) {
          translationCache.delete(firstKey);
        }
      }
    } catch (error) {
      console.error("Translation error:", error);
      
      let errorMessage = "翻訳エラーが発生しました";
      
      // Try fallback to Ollama if ML engine failed
      if (useMLEngine && mlEngineHealthy && isHealthy) {
        console.log("ML Engine failed, falling back to Ollama...");
        try {
          const startTime = performance.now();
          const response = await invoke<TranslateResponse>("translate", {
            text,
            fromLang: actualFromLang,
            toLang: actualToLang,
          });
          setTranslatedText(response.translated_text);
          const latency = Math.round(performance.now() - startTime);
          setLastTranslationLatency(latency);
          setLastUsedEngine('ollama');
          console.log(`🤖 Ollama fallback translation completed in ${latency}ms`);
          
          // Cache the translation
          translationCache.set(cacheKey, response.translated_text);
          
          // Save to history if enabled (fallback case)
          const saveHistory = localStorage.getItem('saveHistory') !== 'false';
          if (saveHistory && text.trim() && response.translated_text.trim()) {
            try {
              const historyPath = localStorage.getItem('historyPath') || undefined;
              await invoke('save_translation_history', {
                sourceText: text,
                translatedText: response.translated_text,
                fromLanguage: actualFromLang,
                toLanguage: actualToLang,
                engine: 'ollama',
                latencyMs: latency > 0 ? latency : undefined,
                historyPath,
              });
              console.log('📚 Fallback translation saved to history');
            } catch (error) {
              console.error('Failed to save fallback translation history:', error);
            }
          }
          
          return; // Successfully fell back to Ollama
        } catch (fallbackError) {
          console.error("Ollama fallback also failed:", fallbackError);
        }
      }
      
      // Both engines failed, show appropriate error message
      if (typeof error === 'string') {
        if (error.includes("Cannot connect to Ollama")) {
          errorMessage = "Ollamaに接続できません。Ollamaが起動していることを確認してください。\n\n起動方法: ollama serve";
        } else if (error.includes("No suitable model available")) {
          errorMessage = "適切なモデルが見つかりません。\n\n以下のコマンドでモデルをインストールしてください:\nollama pull llama3.1:8b";
        } else if (error.includes("model")) {
          errorMessage = "モデルの読み込みエラーです。しばらく待ってから再試行してください。";
        } else {
          errorMessage = `エラー: ${error}`;
        }
      } else if (!isHealthy && !mlEngineHealthy) {
        errorMessage = "翻訳エンジンが利用できません。\n\nOllamaを起動してください:\nollama serve";
      }
      
      setTranslatedText(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  }

  async function translateText(text: string) {
    await detectLanguageAndTranslate(text);
  }

  function switchLanguages() {
    if (fromLang !== "Auto") {
      const tempLang = fromLang;
      setFromLang(toLang);
      setToLang(tempLang);
      
      const tempText = inputText;
      setInputText(translatedText);
      setTranslatedText(tempText);
    }
  }

  const setupNativeLanguage = (language: string) => {
    localStorage.setItem("nativeLang", language);
    setToLang(language);
    setShowLanguageSetup(false);
  };

  if (showLanguageSetup) {
    return <LanguageSetupModal onLanguageSelect={setupNativeLanguage} />;
  }

  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  if (showHistory) {
    return (
      <HistoryScreen 
        onBack={() => setShowHistory(false)}
        onLoadTranslation={(sourceText) => {
          setInputText(sourceText);
          // Auto-translate the loaded translation
          translateText(sourceText);
        }}
      />
    );
  }

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Pacifico, cursive' }}>
                NeuraL
              </h1>
              <span className="text-sm text-gray-500">Translator</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* ML Engine Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                mlEngineHealthy ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  mlEngineHealthy ? 'bg-blue-500' : 'bg-gray-400'
                } ${mlEngineHealthy ? 'animate-pulse' : ''}`} />
                <span>🧠 ML{mlEngineHealthy ? '加速' : '開発中'}</span>
              </div>
              
              {/* Ollama Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isHealthy ? 'bg-green-500' : 'bg-red-500'
                } ${isHealthy ? 'animate-pulse' : ''}`} />
                <span>🤖 Ollama{isHealthy ? 'オンライン' : 'オフライン'}</span>
              </div>
              
              {/* Engine Preference Toggle */}
              {(mlEngineHealthy || isHealthy) && (
                <button
                  onClick={() => setUseMLEngine(!useMLEngine)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    useMLEngine && mlEngineHealthy
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                  disabled={!mlEngineHealthy && !isHealthy}
                  title={!mlEngineHealthy ? 'MLエンジンは現在開発中です' : 'エンジンを切り替え'}
                >
                  {useMLEngine && mlEngineHealthy ? '🧠 ML加速' : '🤖 Ollama'}
                </button>
              )}
              
              <button
                onClick={() => setAutoTranslate(!autoTranslate)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  autoTranslate 
                    ? 'bg-purple-500 text-white hover:bg-purple-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                自動翻訳
              </button>
              
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <i className="ri-history-line text-lg"></i>
                履歴
              </button>
              
              <SettingsButton onSettingsClick={() => setShowSettings(true)} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden">
        <div className="h-full flex flex-col gap-4">
          {/* Language Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <LanguageSelector
                selectedLanguage={fromLang}
                onLanguageChange={setFromLang}
                languages={[{ code: 'Auto', name: '言語を検出', flag: '🌐' }, ...languages]}
                label="翻訳元"
              />
              
              <button
                onClick={switchLanguages}
                className="p-3 rounded-full hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={fromLang === "Auto"}
                title="言語を入れ替え"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
              
              <LanguageSelector
                selectedLanguage={toLang}
                onLanguageChange={setToLang}
                languages={languages}
                label="翻訳先"
              />
            </div>
          </div>

          {/* Translation Area */}
          <div className="flex-1 min-h-0">
            <TranslateArea
              sourceText={inputText}
              translatedText={translatedText}
              onSourceTextChange={setInputText}
              isTranslating={isTranslating}
              latency={lastTranslationLatency}
              engine={lastUsedEngine}
            />
          </div>

          {/* Shortcut hints */}
          <div className="text-center text-sm text-gray-500 space-y-1">
            <div>
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">⌘</kbd> + 
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded mx-1">C</kbd> + 
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">C</kbd> でクイック起動
            </div>
            <div className="flex justify-center items-center space-x-4 text-xs text-gray-400">
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘⇧S</kbd> 言語切替
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘K</kbd> クリア
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘⇧C</kbd> コピー
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;