#!/usr/bin/env python3
import boto3
import json
import time

# Create Bedrock Agent Runtime client
client = boto3.client('bedrock-agent-runtime', region_name='ap-northeast-1')

# Test parameters
agent_id = 'COQ90W7NTA'
agent_alias_id = 'D7T8ZCLVS4'
session_id = f'test-session-{int(time.time())}'
input_text = 'Technology Programming'

print(f"🔍 Testing Bedrock Agent...")
print(f"Agent ID: {agent_id}")
print(f"Alias ID: {agent_alias_id}")
print(f"Session ID: {session_id}")
print(f"Input: {input_text}")
print()

try:
    # Invoke agent
    response = client.invoke_agent(
        agentId=agent_id,
        agentAliasId=agent_alias_id,
        sessionId=session_id,
        inputText=input_text
    )
    
    print("📥 Response stream events:")
    print()
    
    event_count = 0
    chunk_count = 0
    
    # Process event stream
    for event in response['completion']:
        event_count += 1
        print(f"Event #{event_count}: {list(event.keys())}")
        
        if 'chunk' in event:
            chunk_count += 1
            chunk_data = event['chunk']
            if 'bytes' in chunk_data:
                text = chunk_data['bytes'].decode('utf-8')
                print(f"  Chunk #{chunk_count} text: {text[:200]}")
        
        elif 'returnControl' in event:
            print(f"  ReturnControl event")
            print(f"  Invocation inputs: {len(event['returnControl'].get('invocationInputs', []))}")
        
        elif 'trace' in event:
            print(f"  Trace event")
        
        print()
    
    print(f"✅ Total events: {event_count}")
    print(f"✅ Total chunks: {chunk_count}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
