#!/usr/bin/env python3
"""
Test Bedrock Agent directly with the same keywords
"""
import boto3
import json
import sys
from datetime import datetime

def test_bedrock_agent():
    # Configuration
    agent_id = "COQ90W7NTA"
    agent_alias_id = "D7T8ZCLVS4"
    region = "ap-northeast-1"
    
    # Keywords to test
    keywords = ["Design", "UI/UX", "Figma", "Typography", "Color"]
    input_text = " ".join(keywords)
    
    print(f"🧪 Testing Bedrock Agent")
    print(f"Agent ID: {agent_id}")
    print(f"Alias ID: {agent_alias_id}")
    print(f"Keywords: {keywords}")
    print(f"Input Text: {input_text}")
    print("-" * 60)
    
    try:
        # Create Bedrock Agent Runtime client
        client = boto3.client('bedrock-agent-runtime', region_name=region)
        
        # Generate unique session ID
        session_id = f"test-session-{int(datetime.now().timestamp() * 1000)}"
        
        print(f"📤 Invoking agent with session: {session_id}")
        
        # Invoke agent
        response = client.invoke_agent(
            agentId=agent_id,
            agentAliasId=agent_alias_id,
            sessionId=session_id,
            inputText=input_text
        )
        
        print(f"✅ Agent invoked successfully")
        print("-" * 60)
        
        # Process streaming response
        event_stream = response['completion']
        full_response = ""
        chunk_count = 0
        
        for event in event_stream:
            chunk_count += 1
            
            if 'chunk' in event:
                chunk = event['chunk']
                if 'bytes' in chunk:
                    chunk_text = chunk['bytes'].decode('utf-8')
                    full_response += chunk_text
                    print(f"📦 Chunk {chunk_count}: {len(chunk_text)} bytes")
            
            elif 'trace' in event:
                trace = event['trace']
                print(f"🔍 Trace event: {json.dumps(trace, indent=2, default=str)}")
        
        print("-" * 60)
        print(f"📊 Summary:")
        print(f"  Total chunks: {chunk_count}")
        print(f"  Response length: {len(full_response)} bytes")
        print("-" * 60)
        print(f"📝 Full Response:")
        print(full_response)
        print("-" * 60)
        
        # Try to parse as JSON
        try:
            parsed = json.loads(full_response)
            print(f"✅ Response is valid JSON")
            print(f"📋 Parsed Response:")
            print(json.dumps(parsed, indent=2))
            
            if 'feeds' in parsed:
                feed_count = len(parsed['feeds'])
                print(f"\n🎯 Result: {feed_count} feeds found")
                
                if feed_count == 0:
                    print("❌ PROBLEM: Bedrock returned 0 feeds!")
                else:
                    print("✅ Feeds found:")
                    for i, feed in enumerate(parsed['feeds'], 1):
                        print(f"  {i}. {feed.get('title', 'Unknown')} - {feed.get('url', 'No URL')}")
            else:
                print("⚠️  No 'feeds' key in response")
                
        except json.JSONDecodeError as e:
            print(f"⚠️  Response is not JSON: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_bedrock_agent()
    sys.exit(0 if success else 1)
