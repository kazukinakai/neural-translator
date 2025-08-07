# Neural ⚡ - The 1-Second Local AI Translator

[🇯🇵 日本語版](README.ja.md)

**Instant translation. Complete privacy. Zero internet required.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)
![Performance](https://img.shields.io/badge/translation_speed-1.0s-gold)

## 💡 Why Neural?

**There are many excellent translation services out there. But I had specific needs:**

DeepL and Google Translate are fantastic services. However, for users like me who need:

- **Instant translations** (real-time chat, simultaneous interpretation)
- **Offline capability** (airplanes, trains, secure environments)
- **Privacy-first approach** (confidential documents, personal data)
- **Unlimited usage** (hundreds of translations per day)
- **Minimal resource usage** (only 150MB when idle!)

I decided to build **my own translation environment leveraging the M4 Mac's incredible performance**.

The result? **Neural translates in 1 second, uses minimal memory, and works completely offline.**

## 🚀 Features

### ⚡ Lightning-Fast Translation
- **1.0 second** - Ultra-fast translation with Aya 23 8B model
- **100% local processing** - No internet required, complete privacy
- **M4 Mac optimized** - Leverages Apple Neural Engine and Metal GPU
- **5-10x faster than web services** - Based on real benchmarks

### 🎯 Three AI Models to Choose From

| Model | Speed | Use Case | Memory |
|-------|-------|----------|--------|
| **Aya 23 8B** 🥇 | 1.0s | Daily use, real-time translation | 4.8GB |
| **Qwen 2.5 3B** 🚀 | 1.7s | Quick translation, low memory | 1.9GB |
| **Llama 3.1 8B** 📚 | 6.2s | High quality, detailed output | 4.9GB |

### 💎 Key Features
- **Real-time performance monitor** - CPU/Memory/GPU usage visualization
- **Drag & drop support** - Translate text files directly
- **AI text enhancement** - Automatically improve translation quality
- **Multi-language support** - Japanese, English, Chinese, Korean, Spanish, French, German
- **Global hotkey** - ⌘+C+C for quick launch
- **Translation history** - Automatic save of past translations
- **Ultra-low memory usage** - Only 150MB when idle (1/4 of Electron apps!)

## 📋 System Requirements

- **OS**: macOS 12.0 or later
- **CPU**: Apple Silicon (M1/M2/M3/M4) recommended
- **Memory**: 8GB minimum (16GB recommended)
- **Storage**: 10GB free space
- **Dependencies**: Ollama 0.4.0 or later

## 🔧 Installation

### Option 1: Build from Source (Currently Required)

```bash
# Prerequisites
# Install Xcode Command Line Tools
xcode-select --install

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js 20+ (via Homebrew)
brew install node

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Clone and build
git clone https://github.com/kazukinakai/neural.git
cd neural

# Download AI models (one-time setup, ~5GB)
ollama pull aya:8b
ollama pull qwen2.5:3b
ollama pull llama3.1:8b

# Install dependencies
pnpm install

# Development mode
pnpm run tauri dev

# Build production app
pnpm run tauri build
# → The .dmg file will be in src-tauri/target/release/bundle/dmg/
```

### Option 2: DMG Release (Coming Soon)

Pre-built releases will be available once the project gains traction.

## 🎮 Usage

### Basic Translation

1. Launch the app
2. Type or paste text in the left panel
3. Translation appears instantly in the right panel (under 1 second!)

### Model Selection

1. Open settings (gear icon)
2. Choose AI model based on your needs:
   - **Speed priority**: Aya 23 8B (1.0s) 👑 Recommended
   - **Low memory**: Qwen 2.5 3B (1.7s)
   - **High quality**: Llama 3.1 8B (6.2s)

### Keyboard Shortcuts

| Function | Shortcut | Description |
|----------|----------|-------------|
| Quick launch | ⌘+C+C | Auto-translate clipboard content |
| Switch languages | ⌘+Shift+S | Swap translation direction |
| Clear text | ⌘+K | Clear input text |
| Copy result | ⌘+C | Copy translation result |

## 🔬 How It's So Fast

### 1. Ollama Inference Optimization
- **Metal-optimized llama.cpp** for direct GPU control
- **Quantized models (Q4_K_M)** - 4x faster with maintained accuracy
- **KV cache optimization** for faster context processing
- **Parallel batch inference** utilizing all CPU cores

### 2. Native Performance with Tauri + Rust
- **No Chromium overhead** unlike Electron
- **1/3 memory usage** (200MB vs Electron's 600MB)
- **Direct OS API access**
- **3x faster startup** (1s vs 3s)

### 3. Translation-Optimized Models
- **Aya 23**: Cohere's multilingual specialist
- **101 language support** with excellent Japanese performance
- **Pre-trained for translation tasks**
- **Deep context understanding** for nuanced translations

### 4. Apple Silicon Optimization
- **Neural Engine utilization** (up to 15.8 TOPS)
- **Unified Memory** - zero CPU-GPU data copying
- **Metal Performance Shaders** for accelerated matrix operations
- **M4-specific optimizations** (ARMv9.2-A instruction set)

## 📊 Performance Benchmarks

### Translation Speed Benchmark (M4 Mac)

**Test**: 100 sentences Japanese ↔ English (news, technical docs, casual conversation)

```
Neural (Aya 23)     : ████ 1.0s avg (0.8-1.2s) ⚡
Neural (Qwen 2.5)   : ██████ 1.7s avg (1.5-2.0s)
Google Translate    : ████████ 2-3s avg
DeepL Web          : ████████████████ 5-10s avg
ChatGPT-4          : ████████████████████ 10-15s avg
Neural (Llama 3.1)  : ████████████████████ 6.2s avg

Test Environment: MacBook Pro M4 Max, 64GB RAM, macOS 15.0
```

### Why Neural Stands Out
- **Ultra-low memory**: 150MB idle (1/4 of typical Electron apps)
- **Instant startup**: Ready in 1 second
- **Completely offline**: No internet dependency
- **Unlimited usage**: No API limits or character restrictions
- **Privacy-first**: All data stays on your machine

## 🛠️ Development

### Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Rust + Tauri 2.3
- **AI Inference**: Ollama + llama.cpp (Metal GPU enabled)
- **Build Tools**: Vite + npm

### Development Commands

```bash
# Start dev server
pnpm run tauri dev

# Run tests
pnpm test

# Lint code
pnpm run lint

# Type check
pnpm run typecheck

# Production build
pnpm run tauri build

# Create DMG installer
pnpm run tauri build -- --bundles dmg
```

### Project Structure

```
neural/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── TranslateArea.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── HistoryScreen.tsx
│   └── App.tsx
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Core logic
│   │   └── ollama.rs      # Ollama integration
│   └── Cargo.toml
├── package.json           # Node dependencies
└── README.md              # This file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) - Local LLM inference engine
- [Tauri](https://tauri.app/) - Native desktop app framework
- [Aya Model](https://cohere.com/) - Multilingual translation model
- [Qwen](https://qwenlm.github.io/) - Lightweight fast model
- [Meta Llama](https://llama.meta.com/) - High-quality language model
- **DeepL & Google Translate** - Inspiration from these excellent services

## 📧 Support

Found a bug or have a suggestion? Please open an issue on [GitHub Issues](https://github.com/kazukinakai/neural/issues).

## 🎯 Roadmap

- [ ] Windows & Linux support
- [ ] More language models
- [ ] Custom fine-tuning support
- [ ] API server mode
- [ ] Browser extension
- [ ] Mobile app (iOS/Android)

---

**Built with ❤️ and frustration-driven development** | [Website](https://agiletec.net)

*Note: This project was born from the need for instant, private translations. While cloud services are excellent, sometimes you just need something that works offline, instantly, and privately.*