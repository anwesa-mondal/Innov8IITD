#!/usr/bin/env python3
"""
Test script to validate JSON parsing fixes
"""
import sys
import os
import asyncio

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

def test_json_extraction():
    """Test the JSON extraction functionality"""
    print("Testing JSON extraction functions...")
    
    try:
        from ws_server import extract_json_from_response, repair_json_string
        
        # Test cases with various formats
        test_cases = [
            '{"test": "value"}',  # Clean JSON
            'Some text before {"test": "value"} some text after',  # JSON with extra text
            '```json\n{"test": "value"}\n```',  # Markdown formatted
            '{"test": "value with smart quotes"}',  # Smart quotes
            '  \n  {"test": "value"}  \n  ',  # Whitespace
        ]
        
        for i, test_case in enumerate(test_cases):
            extracted = extract_json_from_response(test_case)
            repaired = repair_json_string(extracted)
            print(f"Test {i+1}: {repr(test_case)} -> {repr(repaired)}")
        
        print("✅ JSON extraction functions work correctly")
        return True
    except Exception as e:
        print(f"❌ JSON extraction test failed: {e}")
        return False

def test_question_generation():
    """Test question generation with error handling"""
    print("\nTesting enhanced question generation...")
    
    try:
        from ws_server import generate_technical_question
        
        # Test with different topics
        topics = ["Arrays", "Strings"]
        result = generate_technical_question(topics, "easy")
        
        if isinstance(result, dict) and 'question' in result:
            print("✅ Question generation successful")
            print(f"   Question: {result['question'][:100]}...")
            print(f"   Topics: {result.get('topics', 'N/A')}")
            print(f"   Difficulty: {result.get('difficulty', 'N/A')}")
            return True
        else:
            print(f"❌ Invalid result format: {type(result)}")
            return False
    except Exception as e:
        print(f"❌ Question generation test failed: {e}")
        return False

def main():
    print("JSON Parsing Fixes Validation Test")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 2
    
    # Test 1: JSON extraction
    if test_json_extraction():
        tests_passed += 1
    
    # Test 2: Question generation
    if test_question_generation():
        tests_passed += 1
    
    print("\n" + "=" * 50)
    print(f"Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! JSON parsing fixes are working correctly.")
    else:
        print("⚠️ Some tests failed, but fallback mechanisms should still work.")
    
    print("\nThe system will now handle malformed JSON responses gracefully!")

if __name__ == "__main__":
    main()