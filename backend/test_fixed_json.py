#!/usr/bin/env python3
"""
Test script to validate JSON parsing fixes
"""

import json

def test_json_cleanup():
    """Test the JSON cleanup functionality"""
    
    # Test case 1: JSON with markdown
    test1 = """```json
{
    "score": 82,
    "feedback": "Good solution"
}
```"""
    
    # Clean the response
    cleaned = test1.strip()
    if cleaned.startswith('```'):
        lines = cleaned.split('\n')
        if lines[0].strip() in ['```json', '```']:
            lines = lines[1:]
        if lines[-1].strip() == '```':
            lines = lines[:-1]
        cleaned = '\n'.join(lines).strip()
    
    print(f"Original: {test1}")
    print(f"Cleaned: {cleaned}")
    
    try:
        result = json.loads(cleaned)
        print(f"✅ Successfully parsed: {result}")
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse: {e}")

    # Test case 2: Valid JSON without markdown
    test2 = '{"score": 75, "feedback": "Needs improvement"}'
    try:
        result = json.loads(test2)
        print(f"✅ Test 2 passed: {result}")
    except json.JSONDecodeError as e:
        print(f"❌ Test 2 failed: {e}")

if __name__ == "__main__":
    test_json_cleanup()
    print("\n🎯 JSON parsing validation complete!")