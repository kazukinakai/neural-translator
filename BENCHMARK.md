# 🚀 Neural Translator - Performance Benchmark

## How to Run Benchmarks

This project includes tools to measure actual translation performance compared to web-based services.

### Prerequisites

1. **Install Ollama models** (choose based on your needs and disk space):
```bash
# Lightweight option (1.9GB)
ollama pull qwen2.5:3b

# Balanced option (4.8GB) 
ollama pull aya:8b

# High-quality option (4.9GB)
ollama pull llama3.1:8b
```

2. **Install benchmark dependencies**:
```bash
cd benchmark
npm install
```

### Running the Benchmark

```bash
cd benchmark
node benchmark.js
```

This will test:
- **Neural Translator** via local Ollama API
- **DeepL Web** via browser automation
- **Google Translate Web** via browser automation

### Test Coverage

The benchmark uses 10 standardized test sentences covering:
- **Length varieties**: Short, medium, long, very long
- **Content types**: Greetings, technical, business, casual, academic, news
- **Complexity levels**: Simple to complex grammatical structures

Each test runs 5 times with the first 2 runs excluded as warmup.

### Results

Results are saved as JSON files with detailed timing data and statistical analysis including:
- Average, min, max, median response times
- Error counts and success rates
- Sample translations for verification

### System Requirements

- **Ollama**: Must be running (`ollama serve`)
- **Chrome/Chromium**: For web service testing
- **Internet connection**: For DeepL and Google Translate tests
- **Recommended RAM**: 8GB+ for larger models

### Expected Performance

Performance varies significantly based on:
- **Hardware**: M1/M2/M3/M4 Macs will be much faster
- **Model size**: Smaller models are faster but may be less accurate
- **Text complexity**: Longer, more complex sentences take longer
- **Network conditions**: Web services depend on internet speed

Run the benchmark yourself to get accurate results for your system!