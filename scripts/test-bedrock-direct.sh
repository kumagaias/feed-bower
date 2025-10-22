#!/bin/bash

# Bedrock Runtime APIで直接Claudeを呼び出してフィードURLを生成できるかテスト

echo "🔍 Testing Bedrock Runtime API with Claude..."
echo ""

# Create request body
cat > /tmp/bedrock-request.json <<'EOF'
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 2000,
  "messages": [
    {
      "role": "user",
      "content": "Please suggest 5 real, well-known RSS/Atom feed URLs related to these keywords: Technology, Programming, AI. Return as JSON array with url, title, description, category, and relevance fields."
    }
  ]
}
EOF

aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --body fileb:///tmp/bedrock-request.json \
  --region ap-northeast-1 \
  /tmp/bedrock-response.json

echo ""
echo "📥 Response:"
if [ -f /tmp/bedrock-response.json ]; then
  cat /tmp/bedrock-response.json | jq -r '.content[0].text' 2>/dev/null || cat /tmp/bedrock-response.json
else
  echo "Error: Response file not created"
fi
