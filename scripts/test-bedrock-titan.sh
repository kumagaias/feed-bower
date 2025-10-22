#!/bin/bash

# Test Bedrock Runtime API with Amazon Titan model

echo "🔍 Testing Bedrock Runtime API with Amazon Titan..."
echo ""

# Create request body for Titan
cat > /tmp/bedrock-titan-request.json <<'EOF'
{
  "inputText": "Please suggest 5 real, well-known RSS/Atom feed URLs related to these keywords: Technology, Programming, AI. Return as JSON array with url, title, description, category, and relevance fields.",
  "textGenerationConfig": {
    "maxTokenCount": 2000,
    "temperature": 0.7,
    "topP": 0.9
  }
}
EOF

echo "📤 Sending request to Titan model..."
aws bedrock-runtime invoke-model \
  --model-id amazon.titan-text-express-v1 \
  --body fileb:///tmp/bedrock-titan-request.json \
  --region ap-northeast-1 \
  /tmp/bedrock-titan-response.json

echo ""
echo "📥 Response:"
if [ -f /tmp/bedrock-titan-response.json ]; then
  cat /tmp/bedrock-titan-response.json | jq -r '.results[0].outputText' 2>/dev/null || cat /tmp/bedrock-titan-response.json
else
  echo "Error: Response file not created"
fi

echo ""
echo ""
echo "🔄 Testing with Titan Lite model..."
aws bedrock-runtime invoke-model \
  --model-id amazon.titan-text-lite-v1 \
  --body fileb:///tmp/bedrock-titan-request.json \
  --region ap-northeast-1 \
  /tmp/bedrock-titan-lite-response.json

echo ""
echo "📥 Titan Lite Response:"
if [ -f /tmp/bedrock-titan-lite-response.json ]; then
  cat /tmp/bedrock-titan-lite-response.json | jq -r '.results[0].outputText' 2>/dev/null || cat /tmp/bedrock-titan-lite-response.json
else
  echo "Error: Response file not created"
fi
