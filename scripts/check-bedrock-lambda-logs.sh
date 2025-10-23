#!/bin/bash

# Bedrock Lambda Function Logs Checker
# This script checks CloudWatch Logs for the Bedrock feed recommendation Lambda function

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
LOG_GROUP_NAME="/aws/lambda/feed-recommendation-function-${ENVIRONMENT}"
HOURS_AGO="${2:-1}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Bedrock Lambda Function Logs Checker${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Environment:${NC} ${ENVIRONMENT}"
echo -e "${GREEN}Log Group:${NC} ${LOG_GROUP_NAME}"
echo -e "${GREEN}Time Range:${NC} Last ${HOURS_AGO} hour(s)"
echo ""

# Calculate start time (in milliseconds)
START_TIME=$(($(date +%s) - (HOURS_AGO * 3600)))000

echo -e "${YELLOW}Checking if log group exists...${NC}"
if ! aws logs describe-log-groups --log-group-name-prefix "${LOG_GROUP_NAME}" --query "logGroups[?logGroupName=='${LOG_GROUP_NAME}'].logGroupName" --output text | grep -q "${LOG_GROUP_NAME}"; then
  echo -e "${RED}❌ Log group not found: ${LOG_GROUP_NAME}${NC}"
  echo -e "${YELLOW}Available log groups:${NC}"
  aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/feed-recommendation" --query "logGroups[].logGroupName" --output text
  exit 1
fi

echo -e "${GREEN}✅ Log group found${NC}"
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Lambda Function Invocations${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check for START RequestId (Lambda invocations)
aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "START RequestId" \
  --query 'events[*].message' \
  --output text | head -20

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Lambda Function Errors${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check for errors
ERROR_LOGS=$(aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "ERROR" \
  --query 'events[*].message' \
  --output text)

if [ -z "$ERROR_LOGS" ]; then
  echo -e "${GREEN}✅ No errors found${NC}"
else
  echo "$ERROR_LOGS"
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Feed Database Loading${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check feed database loading
aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "feed" \
  --query 'events[*].message' \
  --output text | grep -i "load\|database\|feed" | head -20

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Lambda Response${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check Lambda responses
aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "response\|return" \
  --query 'events[*].message' \
  --output text | head -20

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Recent Log Entries (Last 50)${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Get recent log entries
aws logs tail "${LOG_GROUP_NAME}" \
  --since "${HOURS_AGO}h" \
  --format short | head -100

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Count invocations
INVOCATION_COUNT=$(aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "START RequestId" \
  --query 'length(events)' \
  --output text)

ERROR_COUNT=$(aws logs filter-log-events \
  --log-group-name "${LOG_GROUP_NAME}" \
  --start-time "${START_TIME}" \
  --filter-pattern "ERROR" \
  --query 'length(events)' \
  --output text)

echo -e "${GREEN}Total Invocations:${NC} ${INVOCATION_COUNT}"
echo -e "${GREEN}Total Errors:${NC} ${ERROR_COUNT}"

if [ "$ERROR_COUNT" -gt 0 ]; then
  echo ""
  echo -e "${RED}⚠️  Lambda function has errors${NC}"
  echo -e "${YELLOW}   Check the error logs above for details${NC}"
elif [ "$INVOCATION_COUNT" -eq 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  No Lambda invocations found${NC}"
  echo -e "${YELLOW}   Lambda function may not be connected to Bedrock Agent${NC}"
else
  echo ""
  echo -e "${GREEN}✅ Lambda function is being invoked${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Check complete!${NC}"
echo -e "${BLUE}========================================${NC}"
