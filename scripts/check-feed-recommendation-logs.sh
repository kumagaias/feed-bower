#!/bin/bash

# Feed Recommendation Logs Checker
# This script checks CloudWatch Logs for feed recommendation activity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
LOG_GROUP_NAME="/aws/lambda/feed-bower-api-${ENVIRONMENT}"
HOURS_AGO="${2:-1}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Feed Recommendation Logs Checker${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Environment:${NC} ${ENVIRONMENT}"
echo -e "${GREEN}Log Group:${NC} ${LOG_GROUP_NAME}"
echo -e "${GREEN}Time Range:${NC} Last ${HOURS_AGO} hour(s)"
echo ""

# Calculate start time (in milliseconds)
START_TIME=$(($(date +%s) - (HOURS_AGO * 3600)))000

echo -e "${YELLOW}Checking Bedrock configuration...${NC}"
echo ""

# Check if Bedrock is configured
aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "Bedrock" \
  --query 'events[*].message' \
  --output text | head -20

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Feed Recommendation Requests${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check feed recommendation requests
aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "FeedRecommendations START" \
  --query 'events[*].message' \
  --output text

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Bedrock Agent Invocations${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check Bedrock invocations
BEDROCK_LOGS=$(aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "BedrockIntegration" \
  --query 'events[*].message' \
  --output text)

if [ -z "$BEDROCK_LOGS" ]; then
  echo -e "${RED}❌ No Bedrock invocations found${NC}"
  echo -e "${YELLOW}⚠️  Bedrock Agent may not be configured or not being used${NC}"
else
  echo "$BEDROCK_LOGS"
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Static Mapping Fallback${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check static mapping usage
STATIC_LOGS=$(aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "StaticMapping" \
  --query 'events[*].message' \
  --output text)

if [ -z "$STATIC_LOGS" ]; then
  echo -e "${GREEN}✅ No static mapping fallback (Bedrock working)${NC}"
else
  echo "$STATIC_LOGS"
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Auto-Register Results${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check auto-register results with source information
aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "AutoRegisterFeeds COMPLETE" \
  --query 'events[*].message' \
  --output text

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Performance Metrics${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check performance metrics
aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "PerformanceMetrics" \
  --query 'events[*].message' \
  --output text

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Count different types of events
BEDROCK_COUNT=$(aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "BedrockIntegration INVOKE_SUCCESS" \
  --query 'length(events)' \
  --output text)

STATIC_COUNT=$(aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "StaticMapping START" \
  --query 'length(events)' \
  --output text)

TOTAL_REQUESTS=$(aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "FeedRecommendations START" \
  --query 'length(events)' \
  --output text)

echo -e "${GREEN}Total Recommendation Requests:${NC} ${TOTAL_REQUESTS}"
echo -e "${GREEN}Bedrock Invocations:${NC} ${BEDROCK_COUNT}"
echo -e "${GREEN}Static Mapping Fallbacks:${NC} ${STATIC_COUNT}"

if [ "$BEDROCK_COUNT" -gt 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Bedrock Agent is active and responding${NC}"
elif [ "$STATIC_COUNT" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Using static mapping fallback${NC}"
  echo -e "${YELLOW}   Bedrock Agent may not be configured${NC}"
else
  echo ""
  echo -e "${RED}❌ No feed recommendations found in logs${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Check complete!${NC}"
echo -e "${BLUE}========================================${NC}"
