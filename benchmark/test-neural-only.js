#!/usr/bin/env node

/**
 * Neural-only benchmark test
 * Quick test to verify Neural translation speeds
 */

const fs = require('fs');
const path = require('path');

// Load test sentences
const testData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'test-sentences.json'), 'utf8')
);

const CONFIG = {
  NEURAL_API: 'http://localhost:11434/api/generate',
  NEURAL_MODEL: 'qwen2.5:3b',
  RUNS: 3
};

async function testNeural(text, model = 'qwen2.5:3b') {
  const prompt = `Translate the following Japanese text to English. Only provide the translation, no explanations:\n\n${text}`;
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(CONFIG.NEURAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });
    
    const data = await response.json();
    const endTime = performance.now();
    
    return {
      success: true,
      time_ms: Math.round(endTime - startTime),
      translation: data.response.trim()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      time_ms: null
    };
  }
}

async function runQuickTest() {
  console.log('🧠 Neural Quick Performance Test');
  console.log('=' .repeat(40));
  
  // Check if Ollama is running
  try {
    const checkResponse = await fetch('http://localhost:11434/api/tags');
    if (!checkResponse.ok) throw new Error('Ollama not responding');
    
    const models = await checkResponse.json();
    console.log(`✅ Ollama is running. Available models: ${models.models?.length || 0}`);
  } catch (error) {
    console.error('❌ Cannot connect to Ollama. Make sure it\'s running:');
    console.log('   ollama serve');
    process.exit(1);
  }
  
  const results = {
    test_date: new Date().toISOString(),
    model: CONFIG.NEURAL_MODEL,
    results: []
  };
  
  // Test first 3 sentences with different complexity
  const testSentences = [
    testData.sentences[0], // short
    testData.sentences[3], // medium
    testData.sentences[7]  // long
  ];
  
  console.log(`\nTesting ${testSentences.length} sentences, ${CONFIG.RUNS} runs each...\n`);
  
  for (const sentence of testSentences) {
    console.log(`📝 Sentence ${sentence.id} (${sentence.length}):`);
    console.log(`   "${sentence.ja}"`);
    
    const times = [];
    
    for (let run = 1; run <= CONFIG.RUNS; run++) {
      process.stdout.write(`   Run ${run}... `);
      
      const result = await testNeural(sentence.ja);
      
      if (result.success) {
        times.push(result.time_ms);
        console.log(`${result.time_ms}ms`);
        
        if (run === 1) {
          console.log(`   Translation: "${result.translation}"`);
        }
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    }
    
    if (times.length > 0) {
      const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`   📊 Average: ${avgTime}ms (${minTime}-${maxTime}ms)`);
      
      results.results.push({
        sentence_id: sentence.id,
        length: sentence.length,
        times: times,
        average_ms: avgTime,
        min_ms: minTime,
        max_ms: maxTime
      });
    }
    
    console.log();
  }
  
  // Summary
  console.log('📊 SUMMARY');
  console.log('=' .repeat(40));
  
  const allTimes = results.results.flatMap(r => r.times);
  if (allTimes.length > 0) {
    const overall_avg = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
    const overall_min = Math.min(...allTimes);
    const overall_max = Math.max(...allTimes);
    
    console.log(`Overall Performance:`);
    console.log(`  Average: ${overall_avg}ms`);
    console.log(`  Range: ${overall_min}ms - ${overall_max}ms`);
    console.log(`  Sample size: ${allTimes.length} translations`);
    
    results.summary = {
      average_ms: overall_avg,
      min_ms: overall_min,
      max_ms: overall_max,
      sample_count: allTimes.length
    };
  }
  
  // Save results
  const timestamp = new Date().toISOString().split('T')[0];
  const resultsFile = path.join(__dirname, `neural-test-${timestamp}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(`\n💾 Results saved to: ${resultsFile}`);
  
  // Performance evaluation
  const avgTime = results.summary.average_ms;
  if (avgTime < 1500) {
    console.log('🚀 EXCELLENT: Sub-1.5 second performance!');
  } else if (avgTime < 3000) {
    console.log('✅ GOOD: Under 3 seconds');
  } else {
    console.log('⚠️  SLOW: Over 3 seconds - check system resources');
  }
}

if (require.main === module) {
  runQuickTest().catch(console.error);
}

module.exports = { testNeural, runQuickTest };