#!/bin/bash

# Real-time Feed Recommendation Logs Viewer
# This script tails CloudWatch Logs for feed recommendation activity in real-time

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
LOG_GROUP_NAME="/aws/lambda/feed-bower-api-${ENVIRONMENT}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Real-time Feed Recommendation Logs${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Environment:${NC} ${ENVIRONMENT}"
echo -e "${GREEN}Log Group:${NC} ${LOG_GROUP_NAME}"
echo ""
echo -e "${YELLOW}Watching for feed recommendation activity...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start time (5 minutes ago to catch recent logs)
START_TIME="5m"

# Function to colorize log output
colorize_log() {
  while IFS= read -r line; do
    if [[ $line == *"BEDROCK"* ]]; then
      echo -e "${MAGENTA}${line}${NC}"
    elif [[ $line == *"StaticMapping"* ]]; then
      echo -e "${CYAN}${line}${NC}"
    elif [[ $line == *"SUCCESS"* ]]; then
      echo -e "${GREEN}${line}${NC}"
    elif [[ $line == *"ERROR"* ]] || [[ $line == *"FAILED"* ]]; then
      echo -e "${RED}${line}${NC}"
    elif [[ $line == *"source=bedrock"* ]]; then
      echo -e "${MAGENTA}${line}${NC}"
    elif [[ $line == *"source=static_mapping"* ]]; then
      echo -e "${CYAN}${line}${NC}"
    else
      echo "$line"
    fi
  done
}

# Tail logs with filter
aws logs tail "${LOG_GROUP_NAME}" \
  --follow \
  --since ${START_TIME} \
  --filter-pattern "FeedRecommendations OR BedrockIntegration OR StaticMapping OR AutoRegisterFeeds OR PerformanceMetrics" \
  --format short | colorize_log
