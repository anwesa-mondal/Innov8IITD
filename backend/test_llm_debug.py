#!/usr/bin/env python3
"""
Debug script to test LLM functionality
"""

import os
from dotenv import load_dotenv
from groq import Groq

def test_llm_connection():
    """Test LLM connection and response"""
    load_dotenv()
    
    api_key = os.getenv("GROQ_API_KEY")
    print(f"🔑 API Key status: {'✅ Found' if api_key else '❌ Missing'}")
    
    if not api_key:
        print("❌ No API key found. Check your .env file.")
        return False
    
    print(f"🔑 API Key length: {len(api_key)} characters")
    
    try:
        client = Groq(api_key=api_key)
        print("✅ Groq client initialized")
        
        # Test simple response
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Reply with exactly: TEST_SUCCESS"}],
            temperature=0.1,
            max_tokens=10
        )
        
        content = response.choices[0].message.content
        print(f"🧪 Test response: '{content}'")
        
        if "TEST_SUCCESS" in content:
            print("✅ LLM responding correctly")
        else:
            print("⚠️ LLM response unexpected")
        
        # Test JSON generation
        json_prompt = """Generate a JSON object with exactly this structure:
{
    "test": "success",
    "number": 42
}"""
        
        json_response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Always respond with valid JSON only. No extra text or markdown."},
                {"role": "user", "content": json_prompt}
            ],
            temperature=0.1,
            max_tokens=50
        )
        
        json_content = json_response.choices[0].message.content
        print(f"📋 JSON test response: {json_content}")
        
        import json
        try:
            parsed = json.loads(json_content.strip())
            print(f"✅ JSON parsing successful: {parsed}")
            return True
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing LLM: {e}")
        return False

if __name__ == "__main__":
    success = test_llm_connection()
    if success:
        print("\n🎉 LLM test completed successfully!")
    else:
        print("\n💥 LLM test failed!")