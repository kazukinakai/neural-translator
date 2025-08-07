mod ollama;

use ollama::{OllamaClient, TranslateRequest, TranslateResponse, DetectLanguageRequest, DetectLanguageResponse};
use tauri::{State, Manager, AppHandle, Emitter};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use std::time::{Duration, Instant};
use std::sync::Mutex as StdMutex;
use once_cell::sync::Lazy;
use std::fs;
use std::path::Path;
use std::env;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::System;

// Double-tap detection state management
#[derive(Debug)]
struct DoubleTapState {
    first_tap_time: Option<Instant>,
    is_waiting_for_second: bool,
}

impl DoubleTapState {
    fn new() -> Self {
        Self {
            first_tap_time: None,
            is_waiting_for_second: false,
        }
    }
    
    fn reset(&mut self) {
        self.first_tap_time = None;
        self.is_waiting_for_second = false;
    }
}

// Global state for double-tap detection
static DOUBLE_TAP_STATE: Lazy<Arc<StdMutex<DoubleTapState>>> = Lazy::new(|| {
    Arc::new(StdMutex::new(DoubleTapState::new()))
});

// Configuration constants for double-tap detection
const DOUBLE_TAP_TIMEOUT_MS: u64 = 300; // Maximum time between taps
const MIN_TAP_INTERVAL_MS: u64 = 50;    // Minimum time to avoid key repeat

// ===== Translation History Data Structures =====

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranslationHistory {
    pub id: String,
    pub timestamp: u64,
    pub source_text: String,
    pub translated_text: String,
    pub from_language: String,
    pub to_language: String,
    pub engine: String, // "ollama" or "ml"
    pub latency_ms: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryFile {
    pub version: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub translations: Vec<TranslationHistory>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn translate(
    text: String,
    from_lang: String,
    to_lang: String,
    state: State<'_, Arc<Mutex<OllamaClient>>>,
) -> Result<TranslateResponse, String> {
    let client = state.lock().await;
    let request = TranslateRequest {
        text,
        from_lang,
        to_lang,
    };
    client.translate(request).await
}

#[tauri::command]
async fn detect_language(
    text: String,
    state: State<'_, Arc<Mutex<OllamaClient>>>,
) -> Result<DetectLanguageResponse, String> {
    let client = state.lock().await;
    let request = DetectLanguageRequest { text };
    client.detect_language(request).await
}

#[tauri::command]
async fn check_ollama_health(
    state: State<'_, Arc<Mutex<OllamaClient>>>,
) -> Result<bool, String> {
    let client = state.lock().await;
    client.check_health().await
}

// ===== Enhanced Ollama Translation Commands =====

#[tauri::command]
async fn translate_with_prompt(
    text: String,
    from_lang: String,
    to_lang: String,
    state: State<'_, Arc<Mutex<OllamaClient>>>,
) -> Result<TranslateResponse, String> {
    let client = state.lock().await;
    
    // Create optimized translation prompt with enhanced instructions
    let translation_prompt = format!(
        "You are an expert professional translator specializing in {} to {} translation.\n\nInstructions:\n- Translate accurately while preserving context, tone, and cultural nuances\n- Maintain the original formatting and structure\n- For technical terms, use widely accepted translations\n- For proper nouns, keep them as-is unless standard translations exist\n- Return ONLY the translation, no explanations or notes\n\nText to translate:\n{}",
        from_lang, to_lang, text
    );
    
    let request = TranslateRequest {
        text: translation_prompt,
        from_lang: from_lang.clone(),
        to_lang: to_lang.clone(),
    };
    
    client.translate_with_prompt(request).await
}

#[tauri::command]
async fn get_translation_models() -> Result<Vec<String>, String> {
    // Return recommended models for translation in priority order
    Ok(vec![
        "aya:8b".to_string(),                    // Translation-specialized multilingual model
        "qwen2.5:3b".to_string(),               // Lightweight translation-optimized model
        "llama3.3:8b-instruct".to_string(),     // High-quality general model with instruction following
        "llama3.1:8b".to_string(),              // Proven general model
        "gemma3:3b".to_string(),                // Fast lightweight alternative
        "phi4-mini".to_string(),                // Ultra-lightweight fallback
    ])
}

#[tauri::command]
async fn improve_text(
    text: String,
    language: String,
    state: State<'_, Arc<Mutex<OllamaClient>>>,
) -> Result<TranslateResponse, String> {
    let client = state.lock().await;
    
    // Create specialized text improvement prompt based on language
    let improvement_prompt = match language.as_str() {
        "Japanese" => format!(
            "あなたは日本語の校正・文章改善のプロフェッショナルです。以下の指示に従ってテキストを改善してください：\n\n指示：\n- より自然で読みやすい日本語に改善\n- 文法的な誤りを修正\n- 表現をより洗練させる\n- 読み手にとって分かりやすくする\n- 改善した文章のみを返す（説明は不要）\n\n改善するテキスト：\n{}",
            text
        ),
        "English" => format!(
            "You are a professional English editor and writing improvement specialist. Please improve the following text according to these instructions:\n\nInstructions:\n- Make the English more natural and fluent\n- Fix any grammatical errors\n- Enhance clarity and readability\n- Improve word choice and style\n- Return only the improved text (no explanations needed)\n\nText to improve:\n{}",
            text
        ),
        "Chinese" => format!(
            "您是专业的中文文本校对和改进专家。请按照以下指示改进文本：\n\n指示：\n- 使中文更加自然流畅\n- 修正语法错误\n- 提高表达的准确性和可读性\n- 优化用词和语言风格\n- 只返回改进后的文本（无需说明）\n\n需要改进的文本：\n{}",
            text
        ),
        "Korean" => format!(
            "당신은 한국어 교정 및 문장 개선 전문가입니다. 다음 지시사항에 따라 텍스트를 개선해주세요:\n\n지시사항:\n- 더 자연스럽고 읽기 쉬운 한국어로 개선\n- 문법적 오류 수정\n- 표현을 더 세련되게 만들기\n- 읽는 사람이 이해하기 쉽게 하기\n- 개선된 문장만 반환 (설명 불필요)\n\n개선할 텍스트:\n{}",
            text
        ),
        "Spanish" => format!(
            "Eres un experto profesional en corrección y mejora de textos en español. Por favor, mejora el siguiente texto según estas instrucciones:\n\nInstrucciones:\n- Hacer el español más natural y fluido\n- Corregir errores gramaticales\n- Mejorar la claridad y legibilidad\n- Perfeccionar la elección de palabras y el estilo\n- Devolver solo el texto mejorado (no se necesitan explicaciones)\n\nTexto a mejorar:\n{}",
            text
        ),
        "French" => format!(
            "Vous êtes un expert professionnel en correction et amélioration de textes français. Veuillez améliorer le texte suivant selon ces instructions :\n\nInstructions :\n- Rendre le français plus naturel et fluide\n- Corriger les erreurs grammaticales\n- Améliorer la clarté et la lisibilité\n- Perfectionner le choix des mots et le style\n- Retourner uniquement le texte amélioré (aucune explication nécessaire)\n\nTexte à améliorer :\n{}",
            text
        ),
        "German" => format!(
            "Sie sind ein professioneller Experte für deutsche Textkorrektur und -verbesserung. Bitte verbessern Sie den folgenden Text gemäß diesen Anweisungen:\n\nAnweisungen:\n- Das Deutsche natürlicher und flüssiger gestalten\n- Grammatikfehler korrigieren\n- Klarheit und Lesbarkeit verbessern\n- Wortwahl und Stil verfeinern\n- Nur den verbesserten Text zurückgeben (keine Erklärungen erforderlich)\n\nZu verbessernder Text:\n{}",
            text
        ),
        _ => format!(
            "You are a professional text editor and improvement specialist. Please improve the following text to make it more natural, clear, and well-written. Fix any grammatical errors and enhance readability. Return only the improved text without explanations.\n\nText to improve:\n{}",
            text
        )
    };
    
    let request = TranslateRequest {
        text: improvement_prompt,
        from_lang: language.clone(),
        to_lang: language, // Same language for improvement
    };
    
    client.translate_with_prompt(request).await
}

// ===== File Processing Commands =====

#[tauri::command]
async fn read_file_content(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err("File not found".to_string());
    }
    
    let extension = path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();
    
    match extension.as_str() {
        "txt" => {
            read_text_file(&file_path).await
        }
        "docx" => {
            read_docx_file(&file_path).await
        }
        "pdf" => {
            read_pdf_file(&file_path).await
        }
        _ => {
            // Try to read as plain text file
            read_text_file(&file_path).await
        }
    }
}

async fn read_text_file(file_path: &str) -> Result<String, String> {
    // Try to read the file with different encodings
    let bytes = fs::read(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Detect encoding and decode
    let (cow, _encoding_used, _had_errors) = encoding_rs::UTF_8.decode(&bytes);
    if !_had_errors {
        return Ok(cow.into_owned());
    }
    
    // Fallback to Shift_JIS for Japanese text files
    let (cow, _encoding_used, _had_errors) = encoding_rs::SHIFT_JIS.decode(&bytes);
    if !_had_errors {
        return Ok(cow.into_owned());
    }
    
    // Last resort: try Windows-1252
    let (cow, _encoding_used, _had_errors) = encoding_rs::WINDOWS_1252.decode(&bytes);
    Ok(cow.into_owned())
}

async fn read_docx_file(file_path: &str) -> Result<String, String> {
    use docx_rs::*;
    
    // Read file as bytes
    let bytes = fs::read(file_path)
        .map_err(|e| format!("Failed to read DOCX file: {}", e))?;
    
    let docx = read_docx(&bytes)
        .map_err(|e| format!("Failed to parse DOCX file: {}", e))?;
    
    // Extract text from all paragraphs - updated for current docx-rs API
    let mut text_content = String::new();
    
    for child in &docx.document.children {
        if let DocumentChild::Paragraph(paragraph) = child {
            for run in &paragraph.children {
                if let ParagraphChild::Run(run) = run {
                    for run_child in &run.children {
                        if let RunChild::Text(text) = run_child {
                            text_content.push_str(&text.text);
                        }
                    }
                }
            }
            text_content.push('\n');
        }
    }
    
    Ok(text_content.trim().to_string())
}

async fn read_pdf_file(file_path: &str) -> Result<String, String> {
    use lopdf::Document;
    
    let doc = Document::load(file_path)
        .map_err(|e| format!("Failed to load PDF file: {}", e))?;
    
    let mut text_content = String::new();
    
    // Extract text from all pages
    for page_num in 1..=doc.get_pages().len() {
        match doc.extract_text(&[page_num as u32]) {
            Ok(page_text) => {
                text_content.push_str(&page_text);
                text_content.push('\n');
            }
            Err(_) => {
                // Continue with other pages if one page fails
                continue;
            }
        }
    }
    
    if text_content.trim().is_empty() {
        return Err("Could not extract text from PDF file".to_string());
    }
    
    Ok(text_content.trim().to_string())
}

#[tauri::command]
async fn validate_file_type(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    
    let extension = path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();
    
    match extension.as_str() {
        "txt" => Ok("text".to_string()),
        "docx" => Ok("docx".to_string()),
        "pdf" => Ok("pdf".to_string()),
        _ => Err("Unsupported file type".to_string()),
    }
}

#[tauri::command]
async fn process_file_content(file_data: String, file_name: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
    
    // Decode base64 file data
    let file_bytes = BASE64.decode(&file_data)
        .map_err(|e| format!("Failed to decode file data: {}", e))?;
    
    // Get file extension
    let extension = file_name.split('.').last()
        .map(|s| s.to_lowercase())
        .unwrap_or_default();
    
    // Create temporary file to process
    let temp_dir = env::temp_dir();
    let temp_file_path = temp_dir.join(format!("neural_temp_{}.{}", 
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis(), 
        extension
    ));
    
    // Write decoded data to temporary file
    fs::write(&temp_file_path, file_bytes)
        .map_err(|e| format!("Failed to write temporary file: {}", e))?;
    
    // Process the file based on extension
    let result = match extension.as_str() {
        "txt" => {
            read_text_file(temp_file_path.to_str().unwrap()).await
        }
        "docx" => {
            read_docx_file(temp_file_path.to_str().unwrap()).await
        }
        "pdf" => {
            read_pdf_file(temp_file_path.to_str().unwrap()).await
        }
        _ => {
            Err(format!("Unsupported file type: {}", extension))
        }
    };
    
    // Clean up temporary file
    let _ = fs::remove_file(&temp_file_path);
    
    result
}

// ===== Translation History Commands =====

#[tauri::command]
async fn save_translation_history(
    source_text: String,
    translated_text: String,
    from_language: String,
    to_language: String,
    engine: String,
    latency_ms: Option<u32>,
    history_path: Option<String>,
) -> Result<String, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let history_entry = TranslationHistory {
        id: format!("{}_{}", timestamp, uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>()),
        timestamp,
        source_text,
        translated_text,
        from_language,
        to_language,
        engine,
        latency_ms,
    };
    
    let default_path = get_default_history_directory();
    let history_dir = history_path.unwrap_or(default_path);
    
    // Create history directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&history_dir) {
        return Err(format!("Failed to create history directory: {}", e));
    }
    
    let history_file_path = Path::new(&history_dir).join("translation_history.json");
    
    // Load existing history or create new
    let mut history_file = if history_file_path.exists() {
        let content = fs::read_to_string(&history_file_path)
            .map_err(|e| format!("Failed to read history file: {}", e))?;
        serde_json::from_str::<HistoryFile>(&content)
            .map_err(|e| format!("Failed to parse history file: {}", e))?
    } else {
        HistoryFile {
            version: "1.0".to_string(),
            created_at: timestamp,
            updated_at: timestamp,
            translations: Vec::new(),
        }
    };
    
    // Add new translation to history
    history_file.translations.push(history_entry.clone());
    history_file.updated_at = timestamp;
    
    // Keep only the last 1000 translations to prevent file from growing too large
    if history_file.translations.len() > 1000 {
        history_file.translations.drain(0..history_file.translations.len() - 1000);
    }
    
    // Save updated history
    let json_content = serde_json::to_string_pretty(&history_file)
        .map_err(|e| format!("Failed to serialize history: {}", e))?;
    
    fs::write(&history_file_path, json_content)
        .map_err(|e| format!("Failed to write history file: {}", e))?;
    
    Ok(history_entry.id)
}

#[tauri::command]
async fn load_translation_history(
    history_path: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<TranslationHistory>, String> {
    let default_path = get_default_history_directory();
    let history_dir = history_path.unwrap_or(default_path);
    let history_file_path = Path::new(&history_dir).join("translation_history.json");
    
    if !history_file_path.exists() {
        return Ok(Vec::new()); // Return empty vec if no history file exists
    }
    
    let content = fs::read_to_string(&history_file_path)
        .map_err(|e| format!("Failed to read history file: {}", e))?;
    
    let history_file: HistoryFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse history file: {}", e))?;
    
    let mut translations = history_file.translations;
    
    // Sort by timestamp (newest first)
    translations.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    // Apply limit if specified
    if let Some(limit) = limit {
        translations.truncate(limit);
    }
    
    Ok(translations)
}

#[tauri::command]
async fn clear_translation_history(history_path: Option<String>) -> Result<(), String> {
    let default_path = get_default_history_directory();
    let history_dir = history_path.unwrap_or(default_path);
    let history_file_path = Path::new(&history_dir).join("translation_history.json");
    
    if history_file_path.exists() {
        fs::remove_file(&history_file_path)
            .map_err(|e| format!("Failed to delete history file: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
async fn get_history_stats(history_path: Option<String>) -> Result<serde_json::Value, String> {
    let default_path = get_default_history_directory();
    let history_dir = history_path.unwrap_or(default_path);
    let history_file_path = Path::new(&history_dir).join("translation_history.json");
    
    if !history_file_path.exists() {
        return Ok(serde_json::json!({
            "total_translations": 0,
            "created_at": null,
            "updated_at": null
        }));
    }
    
    let content = fs::read_to_string(&history_file_path)
        .map_err(|e| format!("Failed to read history file: {}", e))?;
    
    let history_file: HistoryFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse history file: {}", e))?;
    
    Ok(serde_json::json!({
        "total_translations": history_file.translations.len(),
        "created_at": history_file.created_at,
        "updated_at": history_file.updated_at,
        "version": history_file.version
    }))
}

fn get_default_history_directory() -> String {
    if cfg!(target_os = "macos") {
        format!("{}/Documents/NeuraL/", std::env::var("HOME").unwrap_or_default())
    } else if cfg!(target_os = "windows") {
        format!("{}\\Documents\\NeuraL\\", std::env::var("USERPROFILE").unwrap_or_default())
    } else {
        format!("{}/.local/share/NeuraL/", std::env::var("HOME").unwrap_or_default())
    }
}

// ===== System Metrics Commands =====

#[tauri::command]
async fn get_system_metrics() -> Result<serde_json::Value, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // Get memory information
    let total_memory = sys.total_memory(); // in KB
    let used_memory = sys.used_memory();   // in KB
    let available_memory = sys.available_memory(); // in KB
    
    // Convert to MB for easier reading
    let total_memory_mb = total_memory / 1024;
    let used_memory_mb = used_memory / 1024;
    let available_memory_mb = available_memory / 1024;
    let memory_usage_percent = if total_memory > 0 {
        ((used_memory as f64 / total_memory as f64) * 100.0) as u32
    } else {
        0
    };
    
    // Get CPU information
    let cpu_count = sys.cpus().len();
    let global_cpu_usage = sys.global_cpu_usage();
    
    // Collect individual CPU core usages
    let cpu_usages: Vec<f32> = sys.cpus().iter().map(|cpu| cpu.cpu_usage()).collect();
    let avg_cpu_usage = if !cpu_usages.is_empty() {
        cpu_usages.iter().sum::<f32>() / cpu_usages.len() as f32
    } else {
        0.0
    };
    
    // Get process-specific information (for our app)
    let current_process_memory = {
        let pid = std::process::id() as usize;
        if let Some(process) = sys.process(sysinfo::Pid::from(pid)) {
            process.memory() / 1024 // Convert to MB
        } else {
            0
        }
    };
    
    // Detect Metal GPU availability (macOS specific)
    let gpu_available = cfg!(target_os = "macos");
    let gpu_status = if gpu_available {
        "Metal GPU Available"
    } else {
        "GPU Not Available"
    };
    
    // Get Ollama process memory if running
    let mut ollama_memory_mb = 0u64;
    for (pid, process) in sys.processes() {
        if process.name().to_string_lossy().to_lowercase().contains("ollama") {
            ollama_memory_mb = process.memory() / 1024; // Convert to MB
            break;
        }
    }
    
    Ok(serde_json::json!({
        "memory": {
            "total_mb": total_memory_mb,
            "used_mb": used_memory_mb,
            "available_mb": available_memory_mb,
            "usage_percent": memory_usage_percent,
            "app_memory_mb": current_process_memory,
            "ollama_memory_mb": ollama_memory_mb,
        },
        "cpu": {
            "count": cpu_count,
            "usage_percent": avg_cpu_usage,
            "global_usage": global_cpu_usage,
            "per_core": cpu_usages,
        },
        "gpu": {
            "available": gpu_available,
            "status": gpu_status,
            "metal_enabled": gpu_available,
        },
        "system": {
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
        }
    }))
}

#[tauri::command]
async fn get_model_metrics(model_name: String) -> Result<serde_json::Value, String> {
    // Get system metrics before/after model operations
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // Estimate model memory usage based on model name
    let estimated_memory_gb = match model_name.as_str() {
        "aya:8b" => 4.8,
        "qwen2.5:3b" => 1.9,
        "llama3.1:8b" => 4.9,
        _ => 0.0,
    };
    
    // Get current Ollama memory usage
    let mut ollama_memory_mb = 0u64;
    for (_pid, process) in sys.processes() {
        if process.name().to_string_lossy().to_lowercase().contains("ollama") {
            ollama_memory_mb = process.memory() / 1024; // Convert to MB
            break;
        }
    }
    
    Ok(serde_json::json!({
        "model": model_name,
        "estimated_size_gb": estimated_memory_gb,
        "current_memory_mb": ollama_memory_mb,
        "loaded": ollama_memory_mb > 100, // If Ollama is using >100MB, likely a model is loaded
    }))
}

#[tauri::command]
async fn get_clipboard_text(app: AppHandle) -> Result<String, String> {
    match app.clipboard().read_text() {
        Ok(text) => Ok(text),
        Err(e) => Err(format!("Failed to read clipboard: {}", e)),
    }
}

#[tauri::command]
async fn set_clipboard_text(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|e| format!("Failed to write to clipboard: {}", e))
}

#[tauri::command]
fn show_window(window: tauri::Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

/// Handle Cmd+C tap for double-tap detection
fn handle_cmd_c_tap(app_handle: AppHandle) {
    let state_result = DOUBLE_TAP_STATE.lock();
    let mut state = match state_result {
        Ok(state) => state,
        Err(e) => {
            tracing::error!("Failed to acquire double-tap state lock: {}", e);
            return;
        }
    };
    
    let now = Instant::now();
    
    // Check if this is a potential second tap
    if let Some(first_time) = state.first_tap_time {
        let elapsed = now.duration_since(first_time);
        
        if state.is_waiting_for_second {
            // Check if within valid double-tap window
            if elapsed > Duration::from_millis(MIN_TAP_INTERVAL_MS) && 
               elapsed <= Duration::from_millis(DOUBLE_TAP_TIMEOUT_MS) {
                // Valid double-tap detected!
                tracing::info!("🎯 Double-tap detected! Launching app...");
                launch_app(app_handle);
                state.reset();
                return;
            } else if elapsed > Duration::from_millis(DOUBLE_TAP_TIMEOUT_MS) {
                // Timeout exceeded, treat as new first tap
                tracing::debug!("Double-tap timeout exceeded, treating as new first tap");
                state.first_tap_time = Some(now);
                state.is_waiting_for_second = true;
                return;
            } else {
                // Too quick, likely key repeat - ignore
                tracing::debug!("Tap too quick after first, ignoring (likely key repeat)");
                return;
            }
        }
    }
    
    // This is the first tap
    tracing::debug!("First Cmd+C tap detected, waiting for second...");
    state.first_tap_time = Some(now);
    state.is_waiting_for_second = true;
}

/// Launch the application window and trigger clipboard translation
fn launch_app(app_handle: AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        // Show and focus the window
        if let Err(e) = window.show() {
            tracing::error!("Failed to show window: {}", e);
        }
        if let Err(e) = window.set_focus() {
            tracing::error!("Failed to focus window: {}", e);
        }
        
        // Emit event to frontend to trigger clipboard read and translation
        if let Err(e) = window.emit("translate-shortcut", ()) {
            tracing::error!("Failed to emit translate-shortcut event: {}", e);
        }
        
        tracing::info!("✅ App launched successfully via double-tap shortcut");
    } else {
        tracing::error!("❌ Failed to get main window for app launch");
    }
}

/// Emit shortcut event to frontend
fn emit_shortcut_event(app_handle: AppHandle, event_name: &str) {
    if let Some(window) = app_handle.get_webview_window("main") {
        if let Err(e) = window.emit(event_name, ()) {
            tracing::error!("Failed to emit {} event: {}", event_name, e);
        } else {
            tracing::info!("✅ Emitted {} shortcut event", event_name);
        }
    } else {
        tracing::error!("❌ Failed to get main window for {} shortcut", event_name);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing for structured logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .init();
    
    tracing::info!("🚀 Starting Neural Translator...");
    
    let ollama_client = Arc::new(Mutex::new(OllamaClient::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(ollama_client)
        .invoke_handler(tauri::generate_handler![
            greet,
            translate,
            detect_language,
            check_ollama_health,
            // Enhanced Ollama translation commands
            translate_with_prompt,
            get_translation_models,
            improve_text,
            // File processing commands
            read_file_content,
            validate_file_type,
            process_file_content,
            // Translation history commands
            save_translation_history,
            load_translation_history,
            clear_translation_history,
            get_history_stats,
            // System metrics commands
            get_system_metrics,
            get_model_metrics,
            // Utility commands
            get_clipboard_text,
            set_clipboard_text,
            show_window
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Create clones for each shortcut before any moves
            let app_handle_cmd_c = app_handle.clone();
            let app_handle_swap = app_handle.clone();
            let app_handle_clear = app_handle.clone();
            let app_handle_copy = app_handle.clone();
            
            // Set window size to 80% of screen size
            if let Some(window) = app.get_webview_window("main") {
                // Get current monitor
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    
                    // Calculate 80% of screen size, accounting for scale factor
                    // Convert physical pixels to logical pixels
                    let width = (size.width as f64 * 0.8 / scale_factor) as u32;
                    let height = (size.height as f64 * 0.8 / scale_factor) as u32;
                    
                    // Set window size
                    let _ = window.set_size(tauri::LogicalSize::new(width, height));
                    
                    // Center the window
                    let _ = window.center();
                }
            }
            
            // Register global shortcut for double-tap Cmd+C+C detection
            tracing::info!("🔗 Registering global shortcut: Cmd+C (double-tap detection)");
            app.global_shortcut().on_shortcut("CmdOrCtrl+C", move |_app, _shortcut, _event| {
                tracing::debug!("⌨️ Cmd+C shortcut triggered");
                handle_cmd_c_tap(app_handle_cmd_c.clone());
            })?;
            
            // Register additional shortcuts
            app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+S", move |_app, _shortcut, _event| {
                tracing::debug!("⌨️ Cmd+Shift+S shortcut triggered - Language swap");
                emit_shortcut_event(app_handle_swap.clone(), "language-swap");
            })?;
            
            app.global_shortcut().on_shortcut("CmdOrCtrl+K", move |_app, _shortcut, _event| {
                tracing::debug!("⌨️ Cmd+K shortcut triggered - Clear text");
                emit_shortcut_event(app_handle_clear.clone(), "clear-text");
            })?;
            
            app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+C", move |_app, _shortcut, _event| {
                tracing::debug!("⌨️ Cmd+Shift+C shortcut triggered - Copy result");
                emit_shortcut_event(app_handle_copy.clone(), "copy-result");
            })?;
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    
    // Test helper: Create a separate DoubleTapState for testing
    fn create_test_state() -> Arc<StdMutex<DoubleTapState>> {
        Arc::new(StdMutex::new(DoubleTapState::new()))
    }
    
    // Test helper: Simulate tap handling with custom state
    fn handle_test_tap(state: &Arc<StdMutex<DoubleTapState>>) -> bool {
        let state_result = state.lock();
        let mut state_guard = match state_result {
            Ok(state) => state,
            Err(_) => return false,
        };
        
        let now = Instant::now();
        
        // Check if this is a potential second tap
        if let Some(first_time) = state_guard.first_tap_time {
            let elapsed = now.duration_since(first_time);
            
            if state_guard.is_waiting_for_second {
                // Check if within valid double-tap window
                if elapsed > Duration::from_millis(MIN_TAP_INTERVAL_MS) && 
                   elapsed <= Duration::from_millis(DOUBLE_TAP_TIMEOUT_MS) {
                    // Valid double-tap detected!
                    state_guard.reset();
                    return true; // Double-tap success
                } else if elapsed > Duration::from_millis(DOUBLE_TAP_TIMEOUT_MS) {
                    // Timeout exceeded, treat as new first tap
                    state_guard.first_tap_time = Some(now);
                    state_guard.is_waiting_for_second = true;
                    return false;
                } else {
                    // Too quick, likely key repeat - ignore
                    return false;
                }
            }
        }
        
        // This is the first tap
        state_guard.first_tap_time = Some(now);
        state_guard.is_waiting_for_second = true;
        false
    }

    mod double_tap_tests {
        use super::*;
        
        #[test]
        fn test_valid_double_tap_200ms() {
            let state = create_test_state();
            
            // First tap
            let result1 = handle_test_tap(&state);
            assert!(!result1, "First tap should not trigger double-tap");
            
            // Wait 200ms (valid interval)
            std::thread::sleep(Duration::from_millis(200));
            
            // Second tap
            let result2 = handle_test_tap(&state);
            assert!(result2, "Second tap after 200ms should trigger double-tap");
        }
        
        #[test]
        fn test_valid_double_tap_boundary_51ms() {
            let state = create_test_state();
            
            // First tap
            handle_test_tap(&state);
            
            // Wait 51ms (just above minimum valid interval)
            std::thread::sleep(Duration::from_millis(51));
            
            // Second tap
            let result = handle_test_tap(&state);
            assert!(result, "Second tap after 51ms should trigger double-tap");
        }
        
        #[test]
        fn test_valid_double_tap_boundary_250ms() {
            let state = create_test_state();
            
            // First tap
            handle_test_tap(&state);
            
            // Wait 250ms (well within valid interval)
            std::thread::sleep(Duration::from_millis(250));
            
            // Second tap
            let result = handle_test_tap(&state);
            assert!(result, "Second tap after 250ms should trigger double-tap");
        }
        
        #[test]
        fn test_too_quick_tap_ignored() {
            let state = create_test_state();
            
            // First tap
            handle_test_tap(&state);
            
            // Wait 30ms (below minimum threshold)
            std::thread::sleep(Duration::from_millis(30));
            
            // Second tap (too quick, should be ignored)
            let result = handle_test_tap(&state);
            assert!(!result, "Too quick second tap should be ignored");
            
            // Verify state is still waiting for second tap
            let state_guard = state.lock().unwrap();
            assert!(state_guard.is_waiting_for_second, "Should still be waiting for second tap");
        }
        
        #[test]
        fn test_timeout_exceeded_new_first_tap() {
            let state = create_test_state();
            
            // First tap
            handle_test_tap(&state);
            
            // Wait 400ms (exceeds timeout)
            std::thread::sleep(Duration::from_millis(400));
            
            // This should be treated as a new first tap
            let result = handle_test_tap(&state);
            assert!(!result, "Tap after timeout should be treated as new first tap");
            
            // Verify state is waiting for second tap
            let state_guard = state.lock().unwrap();
            assert!(state_guard.is_waiting_for_second, "Should be waiting for second tap");
        }
        
        #[test]
        fn test_single_tap_no_trigger() {
            let state = create_test_state();
            
            // Single tap
            let result = handle_test_tap(&state);
            assert!(!result, "Single tap should not trigger double-tap");
            
            // Verify state
            let state_guard = state.lock().unwrap();
            assert!(state_guard.is_waiting_for_second, "Should be waiting for second tap");
            assert!(state_guard.first_tap_time.is_some(), "First tap time should be recorded");
        }
        
        #[test]
        fn test_triple_tap_behavior() {
            let state = create_test_state();
            
            // First tap
            handle_test_tap(&state);
            std::thread::sleep(Duration::from_millis(100));
            
            // Second tap (should trigger)
            let result2 = handle_test_tap(&state);
            assert!(result2, "Second tap should trigger double-tap");
            
            // Third tap (should be treated as new first tap)
            std::thread::sleep(Duration::from_millis(100));
            let result3 = handle_test_tap(&state);
            assert!(!result3, "Third tap should be treated as new first tap");
        }
    }

    mod state_management_tests {
        use super::*;
        
        #[test]
        fn test_initial_state() {
            let state = DoubleTapState::new();
            assert!(state.first_tap_time.is_none(), "Initial first_tap_time should be None");
            assert!(!state.is_waiting_for_second, "Initial is_waiting_for_second should be false");
        }
        
        #[test]
        fn test_state_reset() {
            let mut state = DoubleTapState::new();
            
            // Set some state
            state.first_tap_time = Some(Instant::now());
            state.is_waiting_for_second = true;
            
            // Reset
            state.reset();
            
            // Verify reset
            assert!(state.first_tap_time.is_none(), "first_tap_time should be None after reset");
            assert!(!state.is_waiting_for_second, "is_waiting_for_second should be false after reset");
        }
        
        #[test]
        fn test_thread_safety() {
            use std::sync::Arc;
            use std::thread;
            
            let state = create_test_state();
            let mut handles = vec![];
            
            // Spawn multiple threads that try to access the state
            for i in 0..10 {
                let state_clone = Arc::clone(&state);
                let handle = thread::spawn(move || {
                    for _ in 0..100 {
                        handle_test_tap(&state_clone);
                        std::thread::sleep(Duration::from_millis(1));
                    }
                    i
                });
                handles.push(handle);
            }
            
            // Wait for all threads to complete
            for handle in handles {
                let result = handle.join();
                assert!(result.is_ok(), "Thread should complete successfully");
            }
            
            // State should be in a consistent state
            let _final_state = state.lock().unwrap();
            // The exact state is unpredictable due to thread interleaving,
            // but the lock should not be poisoned
            assert!(!std::thread::panicking(), "No panics should occur during concurrent access");
        }
    }

    mod timing_tests {
        use super::*;
        
        #[test]
        fn test_timing_constants() {
            assert_eq!(DOUBLE_TAP_TIMEOUT_MS, 300, "Double-tap timeout should be 300ms");
            assert_eq!(MIN_TAP_INTERVAL_MS, 50, "Minimum tap interval should be 50ms");
            assert!(MIN_TAP_INTERVAL_MS < DOUBLE_TAP_TIMEOUT_MS, "Min interval should be less than timeout");
        }
        
        #[test]
        fn test_precise_timing_boundaries() {
            // Test very short interval (should be ignored)
            let state = create_test_state();
            handle_test_tap(&state);
            std::thread::sleep(Duration::from_millis(20));
            let result_20 = handle_test_tap(&state);
            assert!(!result_20, "20ms should be ignored (too quick)");
            
            // Reset and test valid interval (should work)
            let state = create_test_state();
            handle_test_tap(&state);
            std::thread::sleep(Duration::from_millis(100));
            let result_100 = handle_test_tap(&state);
            assert!(result_100, "100ms should trigger double-tap");
            
            // Reset and test long timeout (should timeout)
            let state = create_test_state();
            handle_test_tap(&state);
            std::thread::sleep(Duration::from_millis(400));
            let result_400 = handle_test_tap(&state);
            assert!(!result_400, "400ms should timeout and be treated as new first tap");
        }
        
        #[test]
        fn test_rapid_succession_taps() {
            let state = create_test_state();
            
            // First tap
            handle_test_tap(&state);
            
            // Rapid taps (simulating key repeat) - use very short delays
            for i in 0..3 {
                std::thread::sleep(Duration::from_millis(5 + i * 5)); // Very quick: 5ms, 10ms, 15ms
                let result = handle_test_tap(&state);
                assert!(!result, "Rapid successive tap #{} should be ignored", i + 1);
            }
            
            // After rapid taps, verify state is still waiting
            let state_guard = state.lock().unwrap();
            assert!(state_guard.is_waiting_for_second, "Should still be waiting for second tap after rapid succession");
            drop(state_guard);
            
            // After sufficient time, a properly timed tap should still work
            std::thread::sleep(Duration::from_millis(100));
            let final_result = handle_test_tap(&state);
            assert!(final_result, "Properly timed tap after rapid succession should work");
        }
    }
}
