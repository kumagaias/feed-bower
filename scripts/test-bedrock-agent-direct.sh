#!/bin/bash

# Test Bedrock Agent directly with AWS CLI

echo "🔍 Testing Bedrock Agent directly..."
echo ""

SESSION_ID="test-session-$(date +%s)"

echo "📤 Invoking Bedrock Agent..."
echo "Agent ID: COQ90W7NTA"
echo "Alias ID: D7T8ZCLVS4"
echo "Session ID: $SESSION_ID"
echo "Input: Technology Programming"
echo ""

aws bedrock-agent-runtime invoke-inline-agent \
  --agent-id COQ90W7NTA \
  --agent-alias-id D7T8ZCLVS4 \
  --session-id "$SESSION_ID" \
  --input-text "Technology Programming" \
  --region ap-northeast-1 \
  /tmp/bedrock-agent-response.txt

echo ""
echo "📥 Response:"
cat /tmp/bedrock-agent-response.txt

echo ""
echo ""
echo "🔍 Response size: $(wc -c < /tmp/bedrock-agent-response.txt) bytes"
