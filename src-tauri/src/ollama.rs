use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslateRequest {
    pub text: String,
    pub from_lang: String,
    pub to_lang: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslateResponse {
    pub translated_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DetectLanguageRequest {
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DetectLanguageResponse {
    pub language: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaResponse {
    response: String,
}

pub struct OllamaClient {
    client: Client,
    base_url: String,
}

impl OllamaClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_url: "http://localhost:11434".to_string(),
        }
    }

    pub async fn translate(&self, request: TranslateRequest) -> Result<TranslateResponse, String> {
        println!("Starting translation: {} -> {}", request.from_lang, request.to_lang);
        
        let prompt = format!(
            "Translate {} to {}:\n{}",
            request.from_lang, request.to_lang, request.text
        );

        self.execute_translation_request(prompt).await
    }

    pub async fn translate_with_prompt(&self, request: TranslateRequest) -> Result<TranslateResponse, String> {
        println!("🚀 Starting optimized prompt translation: {} -> {}", request.from_lang, request.to_lang);
        
        // Use the text directly as it's already a formatted prompt from lib.rs
        self.execute_translation_request(request.text).await
    }

    async fn execute_translation_request(&self, prompt: String) -> Result<TranslateResponse, String> {

        // Try translation-optimized models in order of preference
        // Priority: translation-specialized > general models optimized for inference
        let models = vec![
            "aya:8b",                  // Translation-specialized multilingual model
            "qwen2.5:3b",             // Lightweight translation-optimized model  
            "llama3.3:8b-instruct",   // High-quality general model with instruction following
            "llama3.1:8b",            // Proven general model
            "gemma3:3b",              // Fast lightweight alternative
            "phi4-mini"               // Ultra-lightweight fallback
        ];
        
        for model in &models {
            println!("Trying model: {}", model);
            
            let body = json!({
                "model": model,
                "prompt": prompt,
                "stream": false,
                "options": {
                    "temperature": 0.3,  // Lower for more consistent translations
                    "top_p": 0.9,
                    "num_predict": 1024,  // More tokens for longer translations
                    "stop": ["\n\n", "Translation:", "Explanation:", "Note:", "Context:"],
                    // M4 Mac optimization settings
                    "num_gpu": -1,       // Use all available GPU layers (Metal)
                    "use_mmap": true,    // Memory mapping for faster model loading
                    "use_mlock": true,   // Lock model in memory on macOS
                    "numa": false,       // Not needed on ARM Macs
                    "num_thread": 10     // Optimal for M4 (10 CPU cores)
                }
            });

            match self.client
                .post(&format!("{}/api/generate", self.base_url))
                .json(&body)
                .send()
                .await {
                Ok(response) => {
                    println!("Response status for {}: {}", model, response.status());
                    
                    if response.status().is_success() {
                        match response.json::<OllamaResponse>().await {
                            Ok(ollama_response) => {
                                println!("Translation successful with model: {}", model);
                                return Ok(TranslateResponse {
                                    translated_text: ollama_response.response.trim().to_string(),
                                });
                            }
                            Err(e) => {
                                println!("Failed to parse response for {}: {}", model, e);
                                continue;
                            }
                        }
                    } else {
                        let status = response.status();
                        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                        println!("API error for {} ({}): {}", model, status, error_text);
                        
                        // If it's a model not found error, try next model
                        if status.as_u16() == 404 || error_text.contains("model") {
                            continue;
                        }
                    }
                }
                Err(e) => {
                    println!("Request failed for {}: {}", model, e);
                    // If connection failed completely, don't try other models
                    if e.is_connect() {
                        return Err(format!("Cannot connect to Ollama server at {}. Please make sure Ollama is running.", self.base_url));
                    }
                    continue;
                }
            }
        }

        Err(format!("No suitable model available. Please install one of: {}", models.join(", ")))
    }

    pub async fn detect_language(&self, request: DetectLanguageRequest) -> Result<DetectLanguageResponse, String> {
        // Simple language detection using character patterns
        let text = &request.text;
        
        // Japanese detection (Hiragana, Katakana, Kanji)
        if text.chars().any(|c| {
            (c >= '\u{3040}' && c <= '\u{309F}') || // Hiragana
            (c >= '\u{30A0}' && c <= '\u{30FF}') || // Katakana
            (c >= '\u{4E00}' && c <= '\u{9FAF}')    // CJK Unified Ideographs
        }) {
            // Check if it's more likely Chinese (simplified patterns)
            let chinese_chars = text.chars().filter(|&c| 
                c >= '\u{4E00}' && c <= '\u{9FAF}' && 
                (c == '的' || c == '是' || c == '在' || c == '有' || c == '了' || c == '和')
            ).count();
            
            if chinese_chars > 0 && text.chars().filter(|&c| c >= '\u{3040}' && c <= '\u{30FF}').count() == 0 {
                return Ok(DetectLanguageResponse { language: "zh".to_string() }); // ISO 639-1
            }
            
            return Ok(DetectLanguageResponse { language: "ja".to_string() }); // ISO 639-1
        }
        
        // Korean detection (Hangul)
        if text.chars().any(|c| c >= '\u{AC00}' && c <= '\u{D7AF}') {
            return Ok(DetectLanguageResponse { language: "ko".to_string() }); // ISO 639-1
        }
        
        // Default to English for other cases
        Ok(DetectLanguageResponse { language: "en".to_string() }) // ISO 639-1
    }

    pub async fn check_health(&self) -> Result<bool, String> {
        println!("Checking Ollama health at: {}", self.base_url);
        
        match self.client
            .get(&format!("{}/api/tags", self.base_url))
            .send()
            .await {
            Ok(response) => {
                println!("Health check response status: {}", response.status());
                
                if response.status().is_success() {
                    // Check if we have any suitable models
                    match response.text().await {
                        Ok(text) => {
                            println!("Available models response: {}", text);
                            
                            // Check for available translation-optimized models
                            let suitable_models = vec![
                                "aya:8b",                  // Translation-specialized
                                "qwen2.5:3b",             // Lightweight translation-optimized
                                "llama3.3:8b-instruct",   // High-quality general
                                "llama3.1:8b",            // Proven general
                                "gemma3:3b",              // Fast lightweight
                                "phi4-mini"               // Ultra-lightweight
                            ];
                            let has_suitable_model = suitable_models.iter().any(|model| text.contains(model));
                            
                            if has_suitable_model {
                                println!("✓ Ollama is healthy and has suitable translation models");
                                // Show which models are available
                                let available_models: Vec<&str> = suitable_models.iter()
                                    .filter(|model| text.contains(*model))
                                    .copied()
                                    .collect();
                                println!("Available models: {}", available_models.join(", "));
                                Ok(true)
                            } else {
                                println!("⚠ Ollama is running but no suitable translation models found");
                                println!("Please install a recommended translation model:");
                                println!("  ollama pull aya:8b              # Translation-specialized (recommended)");
                                println!("  ollama pull qwen2.5:3b          # Lightweight translation-optimized");
                                println!("  ollama pull llama3.3:8b-instruct # High-quality general model");
                                println!("  ollama pull gemma3:3b           # Fast lightweight alternative");
                                Ok(false)
                            }
                        }
                        Err(e) => {
                            println!("Failed to read models list: {}", e);
                            Ok(false)
                        }
                    }
                } else {
                    println!("Ollama API returned error: {}", response.status());
                    Ok(false)
                }
            }
            Err(e) => {
                println!("Cannot connect to Ollama: {}", e);
                if e.is_connect() {
                    println!("Connection failed - Ollama may not be running");
                }
                Ok(false)
            }
        }
    }
}