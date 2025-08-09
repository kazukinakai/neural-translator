#!/usr/bin/env node

/**
 * Neural Translator Benchmark Script
 * 
 * Measures actual translation latency for:
 * 1. Neural (via Ollama API)
 * 2. DeepL Web (via Puppeteer automation)
 * 3. Google Translate Web (via Puppeteer automation)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Load test sentences
const testData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'test-sentences.json'), 'utf8')
);

// Configuration
const CONFIG = {
  NEURAL_API: 'http://localhost:11434/api/generate', // Ollama API
  NEURAL_MODEL: 'aya:8b',
  DEEPL_URL: 'https://www.deepl.com/translator',
  GOOGLE_URL: 'https://translate.google.com',
  RUNS_PER_SERVICE: 5,
  WARMUP_RUNS: 2, // Warmup runs to exclude from timing
};

// Results storage
const results = {
  test_date: new Date().toISOString(),
  test_environment: {
    platform: process.platform,
    arch: process.arch,
    node_version: process.version,
    // Will be filled in manually or via system info
    machine: "MacBook Pro M4 Max",
    ram: "64GB",
    os: "macOS 15.0"
  },
  config: CONFIG,
  services: {}
};

/**
 * Test Neural translation speed via Ollama API
 */
async function testNeural(text) {
  const prompt = `Translate the following Japanese text to English. Only provide the translation, no explanations:\n\n${text}`;
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(CONFIG.NEURAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.NEURAL_MODEL,
        prompt: prompt,
        stream: false
      })
    });
    
    const data = await response.json();
    const endTime = performance.now();
    
    return {
      success: true,
      time_ms: Math.round(endTime - startTime),
      translation: data.response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      time_ms: null
    };
  }
}

/**
 * Test DeepL Web translation speed
 */
async function testDeepLWeb(browser, text) {
  const page = await browser.newPage();
  
  try {
    await page.goto(CONFIG.DEEPL_URL, { waitUntil: 'networkidle2' });
    
    // Clear any existing text
    await page.evaluate(() => {
      const sourceTextarea = document.querySelector('[dl-test="translator-source-input"]');
      if (sourceTextarea) sourceTextarea.value = '';
    });
    
    const startTime = performance.now();
    
    // Type the text
    await page.type('[dl-test="translator-source-input"]', text);
    
    // Wait for translation to appear
    await page.waitForFunction(
      () => {
        const targetArea = document.querySelector('[dl-test="translator-target-input"]');
        return targetArea && targetArea.textContent.trim().length > 0;
      },
      { timeout: 15000 }
    );
    
    const endTime = performance.now();
    
    // Get the translation
    const translation = await page.evaluate(() => {
      const targetArea = document.querySelector('[dl-test="translator-target-input"]');
      return targetArea ? targetArea.textContent.trim() : '';
    });
    
    await page.close();
    
    return {
      success: true,
      time_ms: Math.round(endTime - startTime),
      translation: translation
    };
  } catch (error) {
    await page.close();
    return {
      success: false,
      error: error.message,
      time_ms: null
    };
  }
}

/**
 * Test Google Translate Web translation speed
 */
async function testGoogleWeb(browser, text) {
  const page = await browser.newPage();
  
  try {
    await page.goto(`${CONFIG.GOOGLE_URL}?sl=ja&tl=en`, { waitUntil: 'networkidle2' });
    
    const startTime = performance.now();
    
    // Clear and type text
    const sourceSelector = 'textarea[aria-label*="Source"]';
    await page.waitForSelector(sourceSelector);
    await page.click(sourceSelector, { clickCount: 3 }); // Select all
    await page.type(sourceSelector, text);
    
    // Wait for translation
    await page.waitForFunction(
      () => {
        const targetArea = document.querySelector('[aria-live="polite"]');
        return targetArea && targetArea.textContent.trim().length > 0;
      },
      { timeout: 10000 }
    );
    
    const endTime = performance.now();
    
    // Get translation
    const translation = await page.evaluate(() => {
      const targetArea = document.querySelector('[aria-live="polite"]');
      return targetArea ? targetArea.textContent.trim() : '';
    });
    
    await page.close();
    
    return {
      success: true,
      time_ms: Math.round(endTime - startTime),
      translation: translation
    };
  } catch (error) {
    await page.close();
    return {
      success: false,
      error: error.message,
      time_ms: null
    };
  }
}

/**
 * Run benchmark for a service
 */
async function benchmarkService(serviceName, testFunction, sentences) {
  console.log(`\n📊 Testing ${serviceName}...`);
  
  const serviceResults = {
    runs: [],
    times: [],
    errors: []
  };
  
  // Test each sentence
  for (const sentence of sentences) {
    console.log(`  Testing sentence ${sentence.id} (${sentence.length})...`);
    
    const sentenceResults = {
      sentence_id: sentence.id,
      runs: []
    };
    
    // Multiple runs for averaging
    for (let run = 0; run < CONFIG.RUNS_PER_SERVICE; run++) {
      const result = await testFunction(sentence.ja);
      
      if (result.success) {
        sentenceResults.runs.push({
          run: run + 1,
          time_ms: result.time_ms,
          translation_preview: result.translation.substring(0, 50) + '...'
        });
        
        // Only count non-warmup runs
        if (run >= CONFIG.WARMUP_RUNS) {
          serviceResults.times.push(result.time_ms);
        }
      } else {
        serviceResults.errors.push({
          sentence_id: sentence.id,
          run: run + 1,
          error: result.error
        });
      }
      
      // Small delay between runs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    serviceResults.runs.push(sentenceResults);
  }
  
  // Calculate statistics
  if (serviceResults.times.length > 0) {
    serviceResults.statistics = {
      average_ms: Math.round(serviceResults.times.reduce((a, b) => a + b, 0) / serviceResults.times.length),
      min_ms: Math.min(...serviceResults.times),
      max_ms: Math.max(...serviceResults.times),
      median_ms: Math.round(serviceResults.times.sort((a, b) => a - b)[Math.floor(serviceResults.times.length / 2)]),
      sample_count: serviceResults.times.length,
      error_count: serviceResults.errors.length
    };
  }
  
  return serviceResults;
}

/**
 * Main benchmark runner
 */
async function runBenchmark() {
  console.log('🚀 Starting Neural Translator Benchmark');
  console.log('=' .repeat(50));
  
  // Test subset of sentences for quick testing
  const testSentences = testData.sentences.slice(0, 3); // Use first 3 for testing
  
  // Test Neural
  console.log('\n1️⃣ Testing Neural (Ollama)...');
  try {
    // Check if Ollama is running
    const checkResponse = await fetch('http://localhost:11434/api/tags');
    if (!checkResponse.ok) throw new Error('Ollama not running');
    
    results.services.neural_aya = await benchmarkService(
      'Neural (Aya 23 8B)',
      (text) => testNeural(text),
      testSentences
    );
  } catch (error) {
    console.error('❌ Neural test failed:', error.message);
    console.log('   Make sure Ollama is running: ollama serve');
    results.services.neural_aya = { error: error.message };
  }
  
  // Test web services with Puppeteer
  console.log('\n2️⃣ Testing Web Services...');
  console.log('   Note: This requires Chrome/Chromium and internet connection');
  
  try {
    const browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Test DeepL
    console.log('\n   Testing DeepL Web...');
    results.services.deepl_web = await benchmarkService(
      'DeepL Web',
      (text) => testDeepLWeb(browser, text),
      testSentences
    );
    
    // Test Google Translate
    console.log('\n   Testing Google Translate Web...');
    results.services.google_web = await benchmarkService(
      'Google Translate Web',
      (text) => testGoogleWeb(browser, text),
      testSentences
    );
    
    await browser.close();
  } catch (error) {
    console.error('❌ Web service tests failed:', error.message);
    console.log('   Make sure puppeteer is installed: npm install puppeteer');
  }
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(__dirname, `benchmark-results-${timestamp}.json`);
  
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to: ${resultsFile}`);
  
  // Print summary
  console.log('\n📊 SUMMARY');
  console.log('=' .repeat(50));
  
  for (const [service, data] of Object.entries(results.services)) {
    if (data.statistics) {
      console.log(`${service}:`);
      console.log(`  Average: ${data.statistics.average_ms}ms`);
      console.log(`  Min: ${data.statistics.min_ms}ms`);
      console.log(`  Max: ${data.statistics.max_ms}ms`);
      console.log(`  Errors: ${data.statistics.error_count}`);
    }
  }
}

// Check if running directly
if (require.main === module) {
  runBenchmark().catch(console.error);
}

module.exports = { testNeural, runBenchmark };