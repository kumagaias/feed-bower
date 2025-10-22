#!/bin/bash

# Check available Bedrock models and their access status

echo "🔍 Checking Bedrock model access..."
echo ""

# List foundation models
echo "📋 Available foundation models:"
aws bedrock list-foundation-models \
  --region ap-northeast-1 \
  --query 'modelSummaries[?contains(modelId, `anthropic`) || contains(modelId, `amazon`)].{ModelId:modelId,ModelName:modelName,Provider:providerName}' \
  --output table

echo ""
echo "💡 To use Anthropic Claude models:"
echo "1. Open AWS Bedrock Console: https://ap-northeast-1.console.aws.amazon.com/bedrock/home?region=ap-northeast-1#/modelaccess"
echo "2. Click on 'Model catalog' in the left menu"
echo "3. Search for 'Claude 3 Haiku'"
echo "4. Click on the model card"
echo "5. If prompted, fill out the use case form"
echo ""
echo "Alternative: Use Amazon Titan models (no approval needed)"
echo "- amazon.titan-text-express-v1"
echo "- amazon.titan-text-lite-v1"
