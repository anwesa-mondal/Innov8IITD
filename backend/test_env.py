#!/usr/bin/env python3
"""
Simple debug script to test LLM without dependencies
"""

import os
import sys

def check_environment():
    """Check if the environment is set up correctly"""
    print(f"🐍 Python version: {sys.version}")
    print(f"📁 Current directory: {os.getcwd()}")
    
    # Check for API key in environment
    api_key = os.environ.get("GROQ_API_KEY")
    print(f"🔑 GROQ_API_KEY in environment: {'✅ Found' if api_key else '❌ Missing'}")
    
    # Try to read .env file directly
    try:
        with open('.env', 'r') as f:
            env_content = f.read()
            if 'GROQ_API_KEY' in env_content:
                print("🔑 GROQ_API_KEY found in .env file: ✅")
                # Extract the key
                for line in env_content.split('\n'):
                    if line.startswith('GROQ_API_KEY='):
                        key = line.split('=', 1)[1]
                        print(f"🔑 Key length: {len(key)} characters")
                        print(f"🔑 Key starts with: {key[:8]}...")
                        os.environ["GROQ_API_KEY"] = key
                        break
            else:
                print("❌ GROQ_API_KEY not found in .env file")
    except FileNotFoundError:
        print("❌ .env file not found")
    
    # Try to import Groq
    try:
        from groq import Groq
        print("✅ Groq import successful")
        
        # Try to create client
        api_key = os.environ.get("GROQ_API_KEY")
        if api_key:
            try:
                client = Groq(api_key=api_key)
                print("✅ Groq client created successfully")
                return True
            except Exception as e:
                print(f"❌ Failed to create Groq client: {e}")
                return False
        else:
            print("❌ No API key available for client creation")
            return False
            
    except ImportError as e:
        print(f"❌ Cannot import Groq: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Environment Debug Check")
    print("=" * 40)
    success = check_environment()
    print("=" * 40)
    if success:
        print("🎉 Environment setup is correct!")
    else:
        print("💥 Environment has issues!")