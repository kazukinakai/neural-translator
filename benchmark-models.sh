#!/bin/bash

# Neural Translator - 高精度速度測定スクリプト
# M4 Mac最適化版

echo "🚀 Neural Translator - Precision Speed Benchmark"
echo "=============================================="

# Test models in priority order
MODELS=("aya:8b" "qwen2.5:3b" "llama3.1:8b")

# Test sentences for comprehensive evaluation
TEST_SENTENCES=(
    "Hello, how are you today?"
    "The weather is beautiful today."
    "この技術革新により、私たちの生活がより便利になります。"
    "Machine learning has revolutionized modern technology."
    "今日は素晴らしい一日でした。"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialize results
RESULTS_FILE="/tmp/neural_translation_benchmark.csv"
echo "model,sentence,attempt,load_time_ms,response_time_ms,total_time_ms,memory_mb" > "$RESULTS_FILE"

# Function to measure memory usage
get_memory_usage() {
    local process_name="ollama"
    local memory_mb=$(ps -eo pid,comm,rss | grep "$process_name" | awk '{sum += $3} END {print int(sum/1024)}')
    echo "${memory_mb:-0}"
}

# Function to test translation with precise timing
benchmark_translation() {
    local model=$1
    local sentence=$2
    local attempt=$3
    
    echo -e "${BLUE}Testing:${NC} $model (attempt $attempt)"
    echo -e "${YELLOW}Input:${NC} $sentence"
    
    # Get memory before
    local memory_before=$(get_memory_usage)
    
    # Measure model loading time (first run) vs response time (subsequent runs)
    local start_time=$(perl -MTime::HiRes=time -E 'say time')
    
    # Use more precise timing with timeout
    local result
    local exit_code
    
    # Create temporary file for output
    local temp_output="/tmp/ollama_output_$$"
    
    timeout 30s ollama run "$model" "Translate to the target language (if English→Japanese, if Japanese→English): $sentence" > "$temp_output" 2>&1
    exit_code=$?
    
    local end_time=$(perl -MTime::HiRes=time -E 'say time')
    
    # Calculate timing
    local total_time_ms=$(echo "($end_time - $start_time) * 1000" | bc -l | cut -d'.' -f1)
    local load_time_ms=0
    local response_time_ms=$total_time_ms
    
    # For first attempt, consider it as loading time
    if [ "$attempt" -eq 1 ]; then
        load_time_ms=$total_time_ms
        response_time_ms=0
        echo -e "${RED}Load time:${NC} ${load_time_ms}ms"
    else
        echo -e "${GREEN}Response time:${NC} ${response_time_ms}ms"
    fi
    
    # Get memory after
    local memory_after=$(get_memory_usage)
    local memory_used=$((memory_after > memory_before ? memory_after : memory_before))
    
    # Read and display result
    if [ $exit_code -eq 0 ] && [ -f "$temp_output" ]; then
        local translation=$(cat "$temp_output" | head -3 | tail -1)
        echo -e "${GREEN}Output:${NC} $translation"
        echo -e "${BLUE}Memory:${NC} ${memory_used}MB"
    else
        echo -e "${RED}Error:${NC} Translation failed or timed out"
        translation="ERROR"
    fi
    
    # Clean up
    rm -f "$temp_output"
    
    # Save to CSV (escape commas)
    local escaped_sentence=$(echo "$sentence" | sed 's/,/;/g')
    local escaped_translation=$(echo "$translation" | sed 's/,/;/g')
    echo "$model,$escaped_sentence,$attempt,$load_time_ms,$response_time_ms,$total_time_ms,$memory_used" >> "$RESULTS_FILE"
    
    echo "----------------------------------------"
    return $exit_code
}

# Function to warm up model (ensure it's loaded)
warm_up_model() {
    local model=$1
    echo -e "${YELLOW}Warming up $model...${NC}"
    timeout 20s ollama run "$model" "Hello" > /dev/null 2>&1
    sleep 2
}

# Check if required tools are available
if ! command -v bc &> /dev/null; then
    echo "Installing bc for calculations..."
    brew install bc
fi

if ! command -v perl &> /dev/null; then
    echo "Perl is required for high-precision timing"
    exit 1
fi

echo ""
echo "Available models for benchmarking:"
for model in "${MODELS[@]}"; do
    if ollama list | grep -q "$model"; then
        echo -e "  ${GREEN}✓${NC} $model"
    else
        echo -e "  ${RED}✗${NC} $model (not available)"
    fi
done
echo ""

# Main benchmarking loop
for model in "${MODELS[@]}"; do
    # Check if model is available
    if ! ollama list | grep -q "$model"; then
        echo -e "${RED}Skipping $model - not installed${NC}"
        continue
    fi
    
    echo "================================================"
    echo -e "${BLUE}🔬 Benchmarking: $model${NC}"
    echo "================================================"
    
    # Test each sentence multiple times for accuracy
    for sentence in "${TEST_SENTENCES[@]}"; do
        echo ""
        echo -e "${YELLOW}📝 Testing sentence:${NC} \"$sentence\""
        echo ""
        
        # Warm up the model first
        warm_up_model "$model"
        
        # Run 3 attempts for each sentence
        for attempt in {1..3}; do
            if ! benchmark_translation "$model" "$sentence" "$attempt"; then
                echo -e "${RED}Failed attempt $attempt, skipping remaining attempts${NC}"
                break
            fi
            
            # Small delay between attempts
            sleep 1
        done
        
        echo ""
    done
    
    echo -e "${GREEN}✅ Completed benchmarking $model${NC}"
    echo ""
done

echo "🎉 Benchmarking completed!"
echo ""

# Generate summary report
echo "📊 Performance Summary Report"
echo "============================"

# Calculate averages for each model
for model in "${MODELS[@]}"; do
    if ! ollama list | grep -q "$model"; then
        continue
    fi
    
    echo ""
    echo -e "${BLUE}$model Performance:${NC}"
    
    # Calculate average load time (first attempts only)
    local avg_load=$(grep "^$model," "$RESULTS_FILE" | awk -F',' '$3==1 {sum+=$4; count++} END {if(count>0) print int(sum/count); else print 0}')
    
    # Calculate average response time (second and third attempts)
    local avg_response=$(grep "^$model," "$RESULTS_FILE" | awk -F',' '$3>1 {sum+=$5; count++} END {if(count>0) print int(sum/count); else print 0}')
    
    # Calculate average memory usage
    local avg_memory=$(grep "^$model," "$RESULTS_FILE" | awk -F',' '{sum+=$7; count++} END {if(count>0) print int(sum/count); else print 0}')
    
    echo "  Load Time: ${avg_load}ms"
    echo "  Response Time: ${avg_response}ms"
    echo "  Memory Usage: ${avg_memory}MB"
    
    # Performance rating
    if [ "$avg_response" -lt 2000 ]; then
        echo -e "  Rating: ${GREEN}⚡ Very Fast${NC}"
    elif [ "$avg_response" -lt 5000 ]; then
        echo -e "  Rating: ${YELLOW}🚀 Fast${NC}"
    else
        echo -e "  Rating: ${RED}🐌 Slow${NC}"
    fi
done

echo ""
echo "📈 Detailed Results: $RESULTS_FILE"
echo "View with: cat $RESULTS_FILE"
echo ""

echo "💡 Recommendations:"
echo "=================="

# Find fastest model
local fastest_model=""
local fastest_time=999999

for model in "${MODELS[@]}"; do
    if ! ollama list | grep -q "$model"; then
        continue
    fi
    
    local avg_time=$(grep "^$model," "$RESULTS_FILE" | awk -F',' '$3>1 {sum+=$5; count++} END {if(count>0) print int(sum/count); else print 999999}')
    
    if [ "$avg_time" -lt "$fastest_time" ]; then
        fastest_time=$avg_time
        fastest_model=$model
    fi
done

echo "🏆 Fastest Model: $fastest_model (${fastest_time}ms average)"
echo "💾 Consider model size vs. speed trade-offs"
echo "🎯 Use fastest model for real-time translation"
echo "🔄 Use larger models for higher quality when speed isn't critical"

echo ""
echo "✅ Benchmark complete! Check the results above."