#!/usr/bin/env python3
"""
Test script to verify the enhanced technical interview system
"""
import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

def test_imports():
    """Test if all required imports work"""
    print("Testing imports...")
    
    try:
        import json
        import asyncio
        import uuid
        import logging
        import time
        print("✓ Standard library imports successful")
    except ImportError as e:
        print(f"✗ Standard library import failed: {e}")
        return False
    
    try:
        from groq import Groq
        print("✓ Groq import successful")
    except ImportError as e:
        print(f"✗ Groq import failed: {e}")
        print("  Install with: pip install groq")
        return False
    
    try:
        from dotenv import load_dotenv
        print("✓ python-dotenv import successful")
    except ImportError as e:
        print(f"✗ python-dotenv import failed: {e}")
        print("  Install with: pip install python-dotenv")
        return False
    
    return True

def test_technical_session():
    """Test TechnicalSession class initialization"""
    print("\nTesting TechnicalSession class...")
    
    try:
        from ws_server import TechnicalSession
        
        session = TechnicalSession("test-user", ["Arrays", "Strings"])
        print(f"✓ TechnicalSession created successfully")
        print(f"  - Session ID: {session.session_id}")
        print(f"  - User ID: {session.user_id}")
        print(f"  - Topics: {session.topics}")
        print(f"  - Current question: {session.current_question_index}")
        print(f"  - Hints used: {session.hints_used}")
        print(f"  - Approach discussed: {session.approach_discussed}")
        print(f"  - Voice responses: {len(session.voice_responses)}")
        
        return True
    except Exception as e:
        print(f"✗ TechnicalSession test failed: {e}")
        return False

def test_llm_functions():
    """Test LLM-related functions"""
    print("\nTesting LLM functions...")
    
    try:
        from ws_server import generate_technical_question, llm_evaluate_code_submission, analyze_approach_discussion
        print("✓ LLM functions imported successfully")
        
        # Note: These would require actual API key to test
        print("  Note: Actual LLM calls require valid API key in .env file")
        return True
    except Exception as e:
        print(f"✗ LLM functions test failed: {e}")
        return False

def test_environment_setup():
    """Test environment configuration"""
    print("\nTesting environment setup...")
    
    env_file = os.path.join(backend_dir, '.env')
    if os.path.exists(env_file):
        print("✓ .env file exists")
        with open(env_file, 'r') as f:
            content = f.read()
            if 'GROQ_API_KEY' in content:
                print("✓ GROQ_API_KEY found in .env file")
            else:
                print("⚠ GROQ_API_KEY not found in .env file")
                print("  Add your Groq API key to .env file")
    else:
        print("⚠ .env file not found")
        print("  Create .env file with GROQ_API_KEY=your_api_key")
    
    requirements_file = os.path.join(backend_dir, 'requirements.txt')
    if os.path.exists(requirements_file):
        print("✓ requirements.txt exists")
    else:
        print("⚠ requirements.txt not found")
    
    return True

def main():
    print("Enhanced Technical Interview System Test")
    print("=" * 50)
    
    all_tests_passed = True
    
    all_tests_passed &= test_imports()
    all_tests_passed &= test_technical_session()
    all_tests_passed &= test_llm_functions()
    all_tests_passed &= test_environment_setup()
    
    print("\n" + "=" * 50)
    if all_tests_passed:
        print("🎉 All tests passed! System appears ready.")
        print("\nNext steps:")
        print("1. Install missing dependencies: pip install -r requirements.txt")
        print("2. Add your Groq API key to .env file")
        print("3. Start backend: python ws_server.py")
        print("4. Start frontend: npm run dev")
    else:
        print("❌ Some tests failed. Please resolve issues above.")
    
    return 0 if all_tests_passed else 1

if __name__ == "__main__":
    sys.exit(main())