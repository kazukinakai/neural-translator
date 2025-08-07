# Neural Translator Benchmark Suite

This directory contains tools to measure actual translation performance of Neural vs other services.

## 📋 Files

- `benchmark.js` - Full benchmark suite (Neural + Web services)
- `test-neural-only.js` - Quick Neural-only performance test
- `test-sentences.json` - Standardized test sentences
- `package.json` - Dependencies (puppeteer for web testing)

## 🚀 Quick Start

### 1. Test Neural Only (Recommended first step)

```bash
# Make sure Neural is running
pnpm run tauri dev

# In another terminal, run quick test
cd benchmark
node test-neural-only.js
```

This will:
- Test 3 sentences of varying complexity
- Run each sentence 3 times
- Show real-time results
- Save results to `neural-test-YYYY-MM-DD.json`

### 2. Full Benchmark (Neural + Web Services)

```bash
# Install dependencies
cd benchmark
pnpm install

# Run full benchmark
node benchmark.js
```

This will test:
- Neural (via Ollama API)
- DeepL Web (via Puppeteer)
- Google Translate Web (via Puppeteer)

⚠️ **Note**: Web testing requires Chrome/Chromium and internet connection.

## 📊 Understanding Results

### Neural Test Results
```json
{
  "test_date": "2024-08-07T10:30:00.000Z",
  "model": "aya:8b",
  "summary": {
    "average_ms": 1050,
    "min_ms": 850,
    "max_ms": 1200,
    "sample_count": 9
  },
  "results": [...]
}
```

### Performance Classification
- **🚀 Excellent**: < 1.5 seconds average
- **✅ Good**: 1.5 - 3.0 seconds average  
- **⚠️ Slow**: > 3.0 seconds average

## 🧪 Test Data

The benchmark uses 10 standardized sentences:
- **3 short** (greetings, simple statements)
- **4 medium** (business, technical, casual)
- **3 long** (news, academic, complex)

All sentences are realistic and represent common translation use cases.

## 🔧 Troubleshooting

### "Cannot connect to Ollama"
```bash
# Start Ollama
ollama serve

# Make sure model is available
ollama list
ollama pull aya:8b
```

### Web tests failing
```bash
# Install Puppeteer dependencies
pnpm install
```

### Inconsistent results
- Run tests multiple times
- Close other apps to free resources
- Check system temperature (thermal throttling)
- Ensure stable internet for web services

## 📈 Using Results for README

After running benchmarks:

1. Copy results to main project
2. Update README.md with actual measurements
3. Include link to benchmark data
4. Add methodology explanation

Example:
```markdown
## Benchmarks (Verified)

Based on actual measurements: [View test data](benchmark/neural-test-2024-08-07.json)

Neural (Aya 23): 1.05s average ⚡
DeepL Web: 5.2s average
Google Translate: 2.8s average

Test methodology: 10 sentences, 3-5 runs each
Environment: MacBook Pro M4 Max, 64GB RAM
```

## 🎯 Next Steps

1. Run `test-neural-only.js` first
2. Verify results are reasonable (< 2 seconds)
3. Run full benchmark if needed
4. Update main README with real data
5. Include evidence files in repo