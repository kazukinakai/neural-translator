#!/bin/bash

# Neural Translator - 3モデル性能比較テスト
# Test translation quality, speed, and performance of three models

echo "🔬 Neural Translator - Translation Models Performance Test"
echo "=========================================================="
echo ""

# Test models in priority order
MODELS=("aya:8b" "qwen2.5:3b" "llama3.1:8b")

# Test data with sentences and their expected language directions
TEST_DATA=(
    "Hello, how are you doing today?|English→Japanese"
    "この素晴らしい技術革新により、私たちの生活はより便利になります。|Japanese→English"
    "The artificial intelligence system can process multiple languages simultaneously.|English→Japanese"
    "今日は天気が良いですね。散歩でもしませんか？|Japanese→English"
    "Machine learning has revolutionized how we approach complex problems.|English→Japanese"
)

echo "Available models for testing:"
for model in "${MODELS[@]}"; do
    echo "  ✓ $model"
done
echo ""

# Function to test translation with timing
test_translation() {
    local model=$1
    local text=$2
    local language_pair=$3
    local prompt="You are an expert professional translator. Translate the following text accurately while preserving context and tone. Return ONLY the translation, no explanations.

Text to translate:
$text"
    
    echo "Testing: $model"
    echo "Input: $text"
    echo -n "Timing: "
    
    # Measure execution time
    start_time=$(date +%s.%3N)
    
    result=$(ollama generate "$model" "$prompt" 2>/dev/null)
    
    end_time=$(date +%s.%3N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    echo "${duration}s"
    echo "Output: $result"
    echo "Language: $language_pair"
    echo "----------------------------------------"
    echo ""
    
    # Return metrics for comparison (escape commas in text)
    escaped_text=$(echo "$text" | sed 's/,/;/g')
    escaped_result=$(echo "$result" | sed 's/,/;/g')
    echo "$model,$escaped_text,$duration,$escaped_result" >> /tmp/translation_test_results.csv
}

# Initialize results file
echo "model,input,duration_seconds,output" > /tmp/translation_test_results.csv

echo "🚀 Starting translation performance tests..."
echo ""

# Test each model with each sentence
for test_item in "${TEST_DATA[@]}"; do
    # Split sentence and language pair
    sentence=$(echo "$test_item" | cut -d'|' -f1)
    language_pair=$(echo "$test_item" | cut -d'|' -f2)
    
    echo "📝 Testing sentence: \"$sentence\""
    echo "Language pair: $language_pair"
    echo ""
    
    for model in "${MODELS[@]}"; do
        test_translation "$model" "$sentence" "$language_pair"
    done
    
    echo "================================================"
    echo ""
done

echo "✅ Performance test completed!"
echo ""

# Display summary statistics
echo "📊 Performance Summary:"
echo "======================"

# Check if we have bc for calculations
if command -v bc &> /dev/null; then
    for model in "${MODELS[@]}"; do
        avg_time=$(grep "^$model," /tmp/translation_test_results.csv | cut -d',' -f3 | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
        echo "$model - Average time: ${avg_time}s"
    done
else
    echo "Install 'bc' for detailed timing statistics: brew install bc"
fi

echo ""
echo "📈 Detailed results saved to: /tmp/translation_test_results.csv"
echo "View results: cat /tmp/translation_test_results.csv"
echo ""

# Quick quality assessment
echo "🎯 Quick Quality Assessment:"
echo "==========================="
echo "Review the translations above and compare:"
echo "  1. Translation accuracy and naturalness"
echo "  2. Preservation of context and tone"  
echo "  3. Speed vs quality trade-offs"
echo "  4. Consistency across different text types"
echo ""

# Show which models are fastest/best for different use cases
echo "💡 Recommendations based on test results:"
echo "========================================"
echo "  • aya:8b - Best for: Translation accuracy and multilingual support"
echo "  • qwen2.5:3b - Best for: Speed and lightweight performance"
echo "  • llama3.1:8b - Best for: General purpose and complex texts"
echo ""

echo "🔧 Next steps:"
echo "============="
echo "1. Review translation quality manually"
echo "2. Test with your specific use cases"
echo "3. Consider memory usage during operation"
echo "4. Evaluate model switching logic in the app"