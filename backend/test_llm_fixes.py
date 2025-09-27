#!/usr/bin/env python3
"""
Quick test script to validate LLM error handling fixes
"""
import os
import sys
import asyncio

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

def test_llm_client_initialization():
    """Test if Groq client initializes properly"""
    print("Testing LLM client initialization...")
    
    try:
        from ws_server import client
        if client:
            print("✅ Groq client initialized successfully")
            return True
        else:
            print("⚠️ Groq client is None (likely missing API key)")
            return False
    except Exception as e:
        print(f"❌ Client initialization failed: {e}")
        return False

def test_question_generation():
    """Test question generation with error handling"""
    print("\nTesting question generation...")
    
    try:
        from ws_server import generate_technical_question
        
        result = generate_technical_question(["Arrays", "Strings"], "medium")
        
        if isinstance(result, dict) and 'question' in result:
            print("✅ Question generation successful")
            print(f"   Generated question: {result['question'][:100]}...")
            return True
        else:
            print(f"❌ Invalid question format: {result}")
            return False
    except Exception as e:
        print(f"❌ Question generation failed: {e}")
        return False

async def test_evaluation_fallback():
    """Test evaluation with fallback functionality"""
    print("\nTesting evaluation fallback...")
    
    try:
        from ws_server import TechnicalSession, llm_evaluate_code_submission
        
        # Create a test session
        session = TechnicalSession("test-user", ["Arrays"])
        session.approach_discussed = False
        
        # Test with sample code
        sample_code = "def solution(arr): return sorted(arr)"
        
        score = await llm_evaluate_code_submission(session, sample_code, "python", 30000, 2)
        
        if isinstance(score, int) and 0 <= score <= 100:
            print(f"✅ Evaluation successful, score: {score}")
            return True
        else:
            print(f"❌ Invalid score: {score}")
            return False
    except Exception as e:
        print(f"❌ Evaluation test failed: {e}")
        return False

async def main():
    print("LLM Error Handling Validation Test")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 3
    
    # Test 1: Client initialization
    if test_llm_client_initialization():
        tests_passed += 1
    
    # Test 2: Question generation
    if test_question_generation():
        tests_passed += 1
    
    # Test 3: Evaluation fallback
    if await test_evaluation_fallback():
        tests_passed += 1
    
    print("\n" + "=" * 50)
    print(f"Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! LLM error handling is working correctly.")
    else:
        print("⚠️ Some tests failed, but fallback mechanisms should handle errors gracefully.")
    
    print("\nNote: If Groq client is None, the system will use fallback methods.")
    print("Make sure GROQ_API_KEY is set in your environment for full functionality.")

if __name__ == "__main__":
    asyncio.run(main())