import os
import json
import uuid
import tempfile
import asyncio
import subprocess
import time
from typing import Optional, Dict, List
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Import all functions from existing modules
from utils import TOPIC_OPTIONS, build_interviewer_prompt, record_with_vad
from interview import transcript_is_valid, transcribe, interviewer_reply, INTERVIEWER_PROMPT
from interview_with_resume import read_resume
from groq import Groq

# Initialize Groq client for LLM-based questions
api_key = os.getenv("GROQ_API_KEY")
print(f"🔑 API Key status: {'✅ Found' if api_key else '❌ Missing'}")
if api_key:
    print(f"🔑 API Key length: {len(api_key)} characters")
    print(f"🔑 API Key starts with: {api_key[:8]}...")

if not api_key:
    print("WARNING: GROQ_API_KEY not found in environment variables")
    print("Add your API key to .env file or set as environment variable")
    client = None
else:
    try:
        client = Groq(api_key=api_key)
        print("✅ Groq client initialized successfully")
        
        # Test the client immediately
        try:
            test_response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": "Reply with just: OK"}],
                temperature=0.1,
                max_tokens=10
            )
            test_content = test_response.choices[0].message.content
            print(f"🧪 Client test successful: '{test_content}'")
        except Exception as test_e:
            print(f"⚠️ Client test failed: {test_e}")
            client = None
            
    except Exception as e:
        print(f"❌ Failed to initialize Groq client: {e}")
        client = None


# -----------------------------
# Technical Interview Questions Database - Now LLM-Generated
# -----------------------------
def extract_json_from_response(response_text: str) -> str:
    """
    Extract JSON from LLM response that might contain extra text
    """
    import re
    
    # Try to find JSON within the response
    json_pattern = r'\{.*\}'
    matches = re.findall(json_pattern, response_text, re.DOTALL)
    
    if matches:
        # Return the largest JSON-like match (most likely to be complete)
        return max(matches, key=len)
    
    return response_text.strip()


def repair_json_string(json_str: str) -> str:
    """
    Attempt to repair common JSON formatting issues
    """
    import re
    
    # Remove any leading/trailing whitespace
    json_str = json_str.strip()
    
    # Remove any markdown code block markers
    json_str = re.sub(r'^```json\s*', '', json_str, flags=re.MULTILINE)
    json_str = re.sub(r'^```\s*', '', json_str, flags=re.MULTILINE)
    json_str = re.sub(r'```\s*$', '', json_str, flags=re.MULTILINE)
    
    # Fix common quote issues
    json_str = re.sub(r'[\u201c\u201d]', '"', json_str)  # Replace smart quotes
    json_str = re.sub(r'[\u2018\u2019]', "'", json_str)  # Replace smart apostrophes
    
    return json_str.strip()


def generate_technical_question(topics: List[str], difficulty: str = "medium") -> dict:
    """
    Generate a technical interview question using LLM based on selected topics
    """
    import json
    
    print(f"🎯 Generating {difficulty} question for topics: {topics}")
    
    if not client:
        print("❌ Groq client not available, using fallback question")
        fallback = {
            "question": f"Write a function to solve a {difficulty} problem related to {', '.join(topics)}. Explain your approach first.",
            "difficulty": difficulty,
            "topics": topics,
            "hints": ["Think about the data structures you need", "Consider the time complexity", "Don't forget edge cases"],
            "test_cases": [{"input": "test input", "output": "expected output", "explanation": "basic test case"}],
            "evaluation_criteria": ["Problem approach", "Code implementation", "Edge cases"]
        }
        print(f"📝 Fallback question: {fallback['question'][:50]}...")
        return fallback
        
    topics_str = ", ".join(topics)
    
    prompt = f"""
You are a senior technical interviewer. Generate a coding interview question as a JSON object.

Topics: {topics_str}
Difficulty: {difficulty}

Format your response exactly like this (no extra text, no markdown):

{{
    "question": "Write a clear problem description with examples",
    "difficulty": "{difficulty}",
    "topics": {json.dumps(topics)},
    "hints": [
        "Helpful hint 1",
        "Helpful hint 2", 
        "Helpful hint 3"
    ],
    "test_cases": [
        {{"input": "sample input", "output": "expected output", "explanation": "test description"}}
    ],
    "evaluation_criteria": [
        "Problem understanding and approach discussion",
        "Code correctness and implementation quality"
    ]
}}
"""
    
    print(f"📤 Sending prompt to LLM...")
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a technical interviewer. Always respond with valid JSON only. Never use markdown formatting or extra text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,  # Very low temperature for consistent formatting
            max_tokens=600
        )
        
        response_content = response.choices[0].message.content
        print(f"📥 Raw LLM Response Length: {len(response_content) if response_content else 0}")
        print(f"📥 Raw LLM Response Preview: {response_content[:100] if response_content else 'EMPTY'}...")
        
        if not response_content or response_content.strip() == "":
            print("❌ Empty response from LLM for question generation")
            raise Exception("Empty LLM response")
        
        # Clean response immediately
        response_content = response_content.strip()
        original_content = response_content
        
        # Remove any markdown code block markers
        if response_content.startswith('```'):
            lines = response_content.split('\n')
            # Remove first line if it's ```json or ```
            if lines[0].strip() in ['```json', '```']:
                lines = lines[1:]
            # Remove last line if it's ```
            if lines[-1].strip() == '```':
                lines = lines[:-1]
            response_content = '\n'.join(lines).strip()
        
        print(f"🧹 Cleaned Response Length: {len(response_content)}")
        print(f"🧹 Cleaned Response Preview: {response_content[:100]}...")
        
        if original_content != response_content:
            print("✂️ Markdown cleanup applied")
        
        question_data = json.loads(response_content)
        print(f"✅ JSON parsing successful")
        
        # Validate required fields
        if not isinstance(question_data, dict) or 'question' not in question_data:
            print(f"❌ Invalid question data structure: {type(question_data)}")
            raise Exception("Invalid question format")
        
        print(f"📋 Generated question: {question_data['question'][:50]}...")
        
        # Ensure all required fields have default values
        question_data.setdefault('difficulty', difficulty)
        question_data.setdefault('topics', topics)
        question_data.setdefault('hints', ["Consider the problem step by step", "Think about edge cases", "Optimize your solution"])
        question_data.setdefault('test_cases', [{"input": "example", "output": "result", "explanation": "test case"}])
        question_data.setdefault('evaluation_criteria', ["Correctness", "Approach", "Code quality"])
        
        return question_data
            
    except Exception as e:
        print(f"Error generating question: {e}")
        # Fallback to a simple question
        return {
            "question": f"Write a function to solve a {difficulty} problem related to {topics_str}. Explain your approach first.",
            "difficulty": difficulty,
            "topics": topics,
            "hints": ["Think about the data structures you need", "Consider the time complexity", "Don't forget edge cases"],
            "test_cases": [{"input": "test input", "output": "expected output", "explanation": "basic test case"}],
            "evaluation_criteria": ["Problem approach", "Code implementation", "Edge cases"]
        }

# -----------------------------
# Technical Interview Session Management
# -----------------------------
class TechnicalSession:
    def __init__(self, topics: List[str]):
        print(f"🏁 Initializing TechnicalSession with topics: {topics}")
        self.topics = topics
        self.questions = []
        self.current_question_index = 0
        self.session_id = str(uuid.uuid4())
        self.start_time = time.time()
        self.question_start_time = time.time()
        self.hints_used = 0
        self.scores = []
        self.approach_discussed = False
        self.voice_responses = []
        self.code_submissions = []
        self.final_evaluation = None  # Store detailed LLM evaluation
        self.question_submitted = False  # Track if current question was already submitted
        
        print(f"🔧 Client status: {'✅ Available' if client else '❌ Not available'}")
        
        # Generate questions using LLM based on selected topics
        difficulties = ["easy", "medium", "medium", "hard"]  # Progressive difficulty
        print(f"📝 Starting to generate {len(difficulties)} questions...")
        
        for i, difficulty in enumerate(difficulties):
            if i < 4:  # Generate up to 4 questions
                print(f"📝 Generating question {i+1}/{len(difficulties)} (difficulty: {difficulty})")
                try:
                    question = generate_technical_question(topics, difficulty)
                    question['id'] = i + 1
                    self.questions.append(question)
                    print(f"✅ Question {i+1} generated successfully: {question.get('question', 'Unknown')[:70]}...")
                except Exception as e:
                    print(f"❌ Failed to generate question {i+1}: {e}")
                    # Add fallback question
                    fallback_question = {
                        "id": i + 1,
                        "question": f"Write a function to solve a {difficulty} problem related to {', '.join(topics)}. Explain your approach.",
                        "difficulty": difficulty,
                        "topics": topics,
                        "hints": ["Think step by step", "Consider edge cases"],
                        "test_cases": [{"input": "example", "output": "result", "explanation": "test"}],
                        "evaluation_criteria": ["Correctness", "Approach"]
                    }
                    self.questions.append(fallback_question)
                    print(f"🔄 Added fallback question {i+1}")
        
        print(f"🎯 Session initialization complete. Generated {len(self.questions)} questions")
    
    def get_current_question(self):
        if self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None
    
    def next_question(self):
        self.current_question_index += 1
        self.question_start_time = time.time()
        self.hints_used = 0
        self.approach_discussed = False
        self.question_submitted = False  # Reset for new question
        return self.get_current_question()
    
    def add_score(self, score: int):
        self.scores.append(score)
    
    def get_final_score(self):
        return sum(self.scores) / len(self.scores) if self.scores else 0
    
    def add_voice_response(self, transcript: str, response_type: str = "approach"):
        """Track voice responses for approach discussion analysis"""
        self.voice_responses.append({
            "transcript": transcript,
            "type": response_type,
            "timestamp": time.time(),
            "question_id": self.current_question_index + 1
        })
    
    def add_code_submission(self, code: str, language: str):
        """Track code submissions for analysis"""
        self.code_submissions.append({
            "code": code,
            "language": language,
            "timestamp": time.time(),
            "question_id": self.current_question_index + 1,
            "hints_used_so_far": self.hints_used
        })


# -----------------------------
# App setup
# -----------------------------
app = FastAPI(title="Interview WebSocket Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# In-memory stores
# -----------------------------
resume_store: dict[str, str] = {}
technical_sessions: dict[str, TechnicalSession] = {}

"""
This server handles both regular interviews and technical coding interviews.
All interview logic (prompts, LLM calls) is delegated to existing functions.
Technical interviews include code evaluation and real-time hints.
"""


# -----------------------------
# HTTP routes
# -----------------------------
@app.get("/")
def root():
	return {"status": "ok", "message": "Interview server running"}


@app.get("/topics")
def list_topics():
	return {"topics": TOPIC_OPTIONS}


@app.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...)):
	if file.content_type not in ("application/pdf", "application/octet-stream"):
		raise HTTPException(status_code=400, detail="Only PDF resumes are supported")

	content = await file.read()
	# Persist to a temp file and use the existing read_resume function
	try:
		with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
			tmp.write(content)
			tmp_path = tmp.name
		text = read_resume(tmp_path) or ""
		if not text:
			raise ValueError("Empty text extracted from resume")
		# No easy way to get page count from read_resume; return -1 to indicate unknown
		page_count = -1
	except Exception as e:
		raise HTTPException(status_code=400, detail=f"Failed to process uploaded PDF: {e}")
	finally:
		try:
			os.unlink(tmp_path)
		except Exception:
			pass

	resume_id = str(uuid.uuid4())
	resume_store[resume_id] = text
	return {"resume_id": resume_id, "pages": page_count}


@app.post("/save_interview_results")
async def save_interview_results(data: dict):
	"""Save interview results as JSON file and return download URL"""
	try:
		interview_id = str(uuid.uuid4())
		filename = f"interview_results_{interview_id}.json"
		
		# Create results directory if it doesn't exist
		results_dir = "interview_results"
		os.makedirs(results_dir, exist_ok=True)
		
		# Save the interview data as JSON
		filepath = os.path.join(results_dir, filename)
		with open(filepath, 'w', encoding='utf-8') as f:
			json.dump(data, f, indent=2, ensure_ascii=False)
		
		return {
			"status": "success",
			"interview_id": interview_id,
			"filename": filename,
			"download_url": f"/download_results/{interview_id}"
		}
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Failed to save results: {str(e)}")


@app.get("/download_results/{interview_id}")
async def download_results(interview_id: str):
	"""Download interview results JSON file"""
	try:
		filename = f"interview_results_{interview_id}.json"
		filepath = os.path.join("interview_results", filename)
		
		if not os.path.exists(filepath):
			raise HTTPException(status_code=404, detail="Interview results not found")
		
		return FileResponse(
			filepath,
			media_type='application/json',
			filename=filename
		)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Failed to download results: {str(e)}")


# -----------------------------
# WebSocket endpoint
# -----------------------------
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
	await ws.accept()

	session = {
		"prompt": None,
		"conversation": []
	}

	try:
		while True:
			data = await ws.receive_text()
			try:
				msg = json.loads(data)
			except Exception:
				await ws.send_text(json.dumps({
					"type": "error", "error": "Invalid JSON message"
				}))
				continue

			mtype = msg.get("type")

			if mtype == "init":
				mode = msg.get("mode")  # "topics" | "resume"
				if mode == "topics":
					topics = msg.get("topics") or []
					if not isinstance(topics, list) or not topics:
						await ws.send_text(json.dumps({
							"type": "error", "error": "Provide non-empty 'topics' list"
						}))
						continue
					# Store session info
					session["mode"] = mode
					session["topics"] = topics
					# Build and set prompt via existing module
					prompt = build_interviewer_prompt(topics)
					# Append jargon correction instruction as in interview.py
					prompt += (
						"\nIf the candidate uses a technical term or jargon that is misspelled or not recognized "
						"(for example, 'kosarachi' instead of 'kosaraju'), try to infer the intended word and "
						"suggest the closest possible correct term in your feedback."
					)
					import interview
					interview.INTERVIEWER_PROMPT = prompt
					session["prompt"] = prompt
					await ws.send_text(json.dumps({
						"type": "ready",
						"message": "Topic-based interview initialized",
						"next_question": "Let's begin. Can you introduce yourself?"
					}))
				elif mode == "resume":
					resume_id = msg.get("resume_id")
					if not resume_id or resume_id not in resume_store:
						await ws.send_text(json.dumps({
							"type": "error", "error": "Invalid or missing resume_id"
						}))
						continue
					# Store session info
					session["mode"] = mode
					session["resume_id"] = resume_id
					resume_text = resume_store[resume_id]
					# Resume-based prompt. Avoid f-string so JSON braces remain literal.
					prompt = """
You are **CodeSage**, an AI technical interviewer.
You are conducting a live mock job interview with the candidate, using their resume as the primary source for questions.

### Interview Context:
- The candidate's resume is provided below. Use its content to guide your questions.
- Focus on their experience, skills, education, and projects mentioned in the resume.
- If name is different from resume, use the name provided in the resume and do not prompt them to confirm.
- If the candidate mentions a project or experience not in the resume, politely ask them to clarify or provide more details.
- If the candidate says "Thank you" , treat it as if the candidate is silent and prompt them to continue.

### Interview Topics:
- Only ask questions directly related to the candidate's resume content.

### Interview Style:
- Speak in a natural, conversational tone.
- Keep answers concise (2–3 sentences max), like a real interviewer.
- Encourage the candidate to think aloud.
- Adapt follow-up questions based on their last response and resume details.
- Be supportive but professional.

### Tasks:
1. For general questions:
	- Evaluate the candidate's response briefly (clarity, correctness, confidence).
	- If the answer is incomplete, politely nudge for more detail.
	- Ask the next resume-based question.

2. For technical or project questions:
	- Compare the candidate's explanation with what's described in the resume.
	- Judge correctness, depth, and relevance.
	- Suggest improvements or ask for more details if needed.
	- If candidate requests a hint, give only a small clue.

3. Jargon or Misspelling:
	- If the candidate uses a technical term or jargon that is misspelled or not recognized (e.g., "kosarachi" instead of "kosaraju"), try to infer the intended word and suggest the closest possible correct term in your feedback.

4. Final feedback (at end of interview):
	- Summarize overall performance:
	  1. Strengths demonstrated
	  2. Areas for improvement
	  3. Overall confidence level
	  4. Recommendation (hire / no hire / needs more practice)

### Response Format:
Always reply in JSON:
{
  "evaluation": "Brief feedback on the candidate's last response.",
  "next_question": "Your next question for the candidate.",
  "hint": "Optional hint if asked.",
  "final_feedback": "Only include this at the end."
}

Resume:
""" + resume_text
					import interview
					interview.INTERVIEWER_PROMPT = prompt
					session["prompt"] = prompt
					await ws.send_text(json.dumps({
						"type": "ready",
						"message": "Resume-based interview initialized",
						"next_question": "Thanks for sharing your resume. Could you give a brief overview of your background?"
					}))
				else:
					await ws.send_text(json.dumps({
						"type": "error", "error": "Unknown mode. Use 'topics' or 'resume'"
					}))

			elif mtype == "answer":
				if not session.get("prompt"):
					await ws.send_text(json.dumps({
						"type": "error", "error": "Session not initialized. Send 'init' first."
					}))
					continue
				candidate = msg.get("text", "").strip()
				if not candidate:
					await ws.send_text(json.dumps({
						"type": "error", "error": "Empty answer text"
					}))
					continue

				# Validate transcript
				if not transcript_is_valid(candidate):
					await ws.send_text(json.dumps({
						"type": "error", "error": "Invalid transcript. Please speak more clearly."
					}))
					continue

				reply = interviewer_reply(candidate, session["conversation"])
				session["conversation"].append({
					"candidate": candidate,
					**reply
				})
				await ws.send_text(json.dumps({"type": "assessment", **reply}))

			elif mtype == "code_submission":
				if not session.get("prompt"):
					await ws.send_text(json.dumps({
						"type": "error", "error": "Session not initialized. Send 'init' first."
					}))
					continue
				code = msg.get("code", "").strip()
				if not code:
					await ws.send_text(json.dumps({
						"type": "error", "error": "Empty code submission"
					}))
					continue

				# Add a delay to simulate code analysis time (3-5 seconds)
				import asyncio
				await asyncio.sleep(4)  # 4 second delay for code analysis
				
				# Process code submission like a regular answer
				candidate_message = f"[Code Submission]\n{code}"
				reply = interviewer_reply(candidate_message, session["conversation"])
				session["conversation"].append({
					"candidate": candidate_message,
					**reply
				})
				await ws.send_text(json.dumps({"type": "assessment", **reply}))

			elif mtype == "record_audio":
				await ws.send_text(json.dumps({"type": "listening", "message": "Listening for speech..."}))
				try:
					filename = f"ws_ans_{len(session['conversation'])}.wav"
					recorded_file, heard_speech = record_with_vad(filename)
					if not heard_speech:
						await ws.send_text(json.dumps({
							"type": "no_speech",
							"message": "No speech detected. Please speak louder or check your microphone."
						}))
						continue
					candidate = transcribe(recorded_file)
					try:
						os.remove(recorded_file)
					except Exception:
						pass
					if not transcript_is_valid(candidate):
						await ws.send_text(json.dumps({
							"type": "invalid_transcript",
							"message": "Could not understand. Please repeat more clearly.",
							"transcript": candidate
						}))
						continue
					await ws.send_text(json.dumps({
						"type": "transcribed",
						"transcript": candidate
					}))
					reply = interviewer_reply(candidate, session["conversation"])
					session["conversation"].append({
						"candidate": candidate,
						**reply
					})
					await ws.send_text(json.dumps({"type": "assessment", **reply}))
				except Exception as e:
					await ws.send_text(json.dumps({
						"type": "error",
						"error": f"Recording failed: {str(e)}"
					}))

			elif mtype == "end":
				# Save interview results before ending
				try:
					if session and "conversation" in session:
						interview_data = {
							"interview_id": str(uuid.uuid4()),
							"timestamp": json.dumps(None, default=str),  # Will be handled by JSON encoder
							"interview_type": session.get("mode", "unknown"),
							"conversation": session["conversation"],
							"resume_id": session.get("resume_id"),
							"topics": session.get("topics", []),
							"total_interactions": len(session["conversation"])
						}
						# Add current timestamp
						import datetime
						interview_data["timestamp"] = datetime.datetime.now().isoformat()
						
						# Save to file
						interview_id = interview_data["interview_id"]
						filename = f"interview_results_{interview_id}.json"
						results_dir = "interview_results"
						os.makedirs(results_dir, exist_ok=True)
						filepath = os.path.join(results_dir, filename)
						
						with open(filepath, 'w', encoding='utf-8') as f:
							json.dump(interview_data, f, indent=2, ensure_ascii=False)
						
						await ws.send_text(json.dumps({
							"type": "ended",
							"interview_id": interview_id,
							"download_url": f"/download_results/{interview_id}"
						}))
					else:
						await ws.send_text(json.dumps({"type": "ended"}))
				except Exception as e:
					await ws.send_text(json.dumps({
						"type": "ended",
						"error": f"Failed to save results: {str(e)}"
					}))
				await ws.close()
				break

			else:
				await ws.send_text(json.dumps({
					"type": "error", "error": f"Unknown message type: {mtype}"
				}))

	except WebSocketDisconnect:
		return


# -----------------------------
# Technical Interview WebSocket endpoint
# -----------------------------
@app.websocket("/ws/technical")
async def technical_ws_endpoint(ws: WebSocket):
	await ws.accept()
	
	session_id = None
	session = None
	
	try:
		while True:
			data = await ws.receive_text()
			try:
				msg = json.loads(data)
			except Exception:
				await ws.send_text(json.dumps({
					"type": "error", "error": "Invalid JSON message"
				}))
				continue

			mtype = msg.get("type")

			if mtype == "init_technical":
				topics = msg.get("topics", [])
				if not topics:
					await ws.send_text(json.dumps({
						"type": "error", "error": "No topics selected"
					}))
					continue
				
				# Create technical interview session
				session = TechnicalSession(topics)
				session_id = session.session_id
				technical_sessions[session_id] = session
				
				# Send first question
				current_question = session.get_current_question()
				if current_question:
					await ws.send_text(json.dumps({
						"type": "question",
						"next_question": current_question['question'],
						"difficulty": current_question['difficulty'],
						"topics": current_question['topics']
					}))
				else:
					await ws.send_text(json.dumps({
						"type": "error", "error": "No questions available for selected topics"
					}))

			elif mtype == "submit_code":
				if not session:
					await ws.send_text(json.dumps({
						"type": "error", "error": "No active session"
					}))
					continue
				
				# Check if this question was already submitted
				if session.question_submitted:
					await ws.send_text(json.dumps({
						"type": "error", "error": "This question has already been submitted. Please wait for the next question."
					}))
					continue
				
				code = msg.get("code", "")
				language = msg.get("language", "python")
				time_spent = msg.get("time_spent", 0)
				hints_used = msg.get("hints_used", 0)
				
				# Mark this question as submitted
				session.question_submitted = True
				
				# Store code submission
				session.add_code_submission(code, language)
				
				print(f"Evaluating submission for question {session.current_question_index + 1}")
				
				# Evaluate the code submission with LLM
				score = await llm_evaluate_code_submission(session, code, language, time_spent, hints_used)
				session.add_score(score)
				
				print(f"Question {session.current_question_index + 1} scored: {score}/100")
				
				# Send feedback to user
				feedback_msg = f"Question {session.current_question_index + 1} completed! Score: {score}/100"
				if session.final_evaluation:
					feedback_msg += f"\n{session.final_evaluation.get('feedback', '')}"
				
				await ws.send_text(json.dumps({
					"type": "code_feedback",
					"code_feedback": feedback_msg,
					"score": score,
					"question_number": session.current_question_index + 1
				}))
				
				# Check if interview is complete
				if session.current_question_index >= len(session.questions) - 1:
					# Interview complete
					final_results = {
						"session_id": session_id,
						"topics": session.topics,
						"total_questions": len(session.questions),
						"completed_questions": len(session.questions),
						"average_score": session.get_final_score(),
						"individual_scores": session.scores,
						"total_time": time.time() - session.start_time,
						"voice_responses": session.voice_responses,
						"code_submissions": session.code_submissions,
						"questions_data": session.questions,
						"final_evaluation": session.final_evaluation,
						"interview_ended_manually": False
					}
					
					# Save results to file
					results_file = f"interview_results/interview_results_{session_id}.json"
					os.makedirs("interview_results", exist_ok=True)
					
					with open(results_file, 'w') as f:
						json.dump(final_results, f, indent=2, default=str)
					
					await ws.send_text(json.dumps({
						"type": "interview_complete",
						"final_feedback": f"Technical interview completed! Final score: {session.get_final_score():.1f}/100",
						"results": final_results,
						"download_url": f"/download_results/{session_id}"
					}))
				else:
					# Move to next question
					next_question_data = session.next_question()
					if next_question_data:
						await ws.send_text(json.dumps({
							"type": "question_complete",
							"score": score,
							"next_question": next_question_data['question'],
							"difficulty": next_question_data['difficulty'],
							"topics": next_question_data['topics']
						}))

			elif mtype == "voice_approach":
				if not session:
					await ws.send_text(json.dumps({
						"type": "error", "error": "No active session"
					}))
					continue
				
				transcript = msg.get("transcript", "")
				if transcript:
					# Store voice response for approach discussion
					session.add_voice_response(transcript, "approach")
					session.approach_discussed = True
					
					# Analyze approach quality
					approach_feedback = await analyze_approach_discussion(session, transcript)
					
					await ws.send_text(json.dumps({
						"type": "approach_feedback",
						"feedback": approach_feedback,
						"approach_discussed": True
					}))

			elif mtype == "record_audio":
				if not session:
					await ws.send_text(json.dumps({
						"type": "error", "error": "No active session"
					}))
					continue
				
				await ws.send_text(json.dumps({"type": "listening", "message": "Listening for your approach..."}))
				try:
					filename = f"technical_approach_{session.session_id}_{len(session.voice_responses)}.wav"
					recorded_file, heard_speech = record_with_vad(filename)
					
					if not heard_speech:
						await ws.send_text(json.dumps({
							"type": "no_speech",
							"message": "No speech detected. Please speak louder or describe your approach."
						}))
						continue
					
					transcript = transcribe(recorded_file)
					try:
						os.remove(recorded_file)
					except Exception:
						pass
					
					if not transcript_is_valid(transcript):
						await ws.send_text(json.dumps({
							"type": "invalid_transcript",
							"message": "Could not understand. Please repeat your approach more clearly.",
							"transcript": transcript
						}))
						continue
					
					# Store and analyze approach
					session.add_voice_response(transcript, "approach")
					session.approach_discussed = True
					
					approach_feedback = await analyze_approach_discussion(session, transcript)
					
					await ws.send_text(json.dumps({
						"type": "approach_analyzed",
						"transcript": transcript,
						"feedback": approach_feedback,
						"approach_discussed": True
					}))
					
				except Exception as e:
					await ws.send_text(json.dumps({
						"type": "error",
						"error": f"Recording failed: {str(e)}"
					}))

			elif mtype == "request_hint":
				if not session:
					await ws.send_text(json.dumps({
						"type": "error", "error": "No active session"
					}))
					continue
				
				current_question_data = session.get_current_question()
				code = msg.get("code", "")
				language = msg.get("language", "python")
				
				# Generate contextual hint using LLM
				hint = await generate_smart_hint(session, current_question_data, code, language)
				session.hints_used += 1
				
				await ws.send_text(json.dumps({
					"type": "hint",
					"hint": hint,
					"hints_used": session.hints_used
				}))

			elif mtype == "stop_recording":
				# Handle stopping voice recording
				await ws.send_text(json.dumps({
					"type": "recording_stopped",
					"message": "Voice recording stopped"
				}))

			elif mtype == "end_interview":
				if not session:
					await ws.send_text(json.dumps({
						"type": "error", "error": "No active session"
					}))
					continue
				
				# Calculate final results
				final_results = {
					"session_id": session_id,
					"topics": session.topics,
					"total_questions": len(session.questions),
					"completed_questions": session.current_question_index + 1,
					"average_score": session.get_final_score(),
					"individual_scores": session.scores,
					"total_time": time.time() - session.start_time,
					"voice_responses": session.voice_responses,
					"code_submissions": session.code_submissions,
					"questions_data": session.questions,
					"final_evaluation": session.final_evaluation,
					"interview_ended_manually": True
				}
				
				# Save results to file
				results_file = f"interview_results/interview_results_{session_id}.json"
				os.makedirs("interview_results", exist_ok=True)
				
				with open(results_file, 'w') as f:
					json.dump(final_results, f, indent=2, default=str)
				
				await ws.send_text(json.dumps({
					"type": "interview_complete",
					"final_feedback": f"Interview ended. Final score: {session.get_final_score():.1f}/100",
					"results": final_results,
					"download_url": f"/download_results/{session_id}"
				}))

			else:
				await ws.send_text(json.dumps({
					"type": "error", "error": f"Unknown message type: {mtype}"
				}))

	except WebSocketDisconnect:
		if session_id and session_id in technical_sessions:
			del technical_sessions[session_id]
		return


# -----------------------------
# Technical Interview Helper Functions - Enhanced with LLM
# -----------------------------
async def llm_evaluate_code_submission(session: TechnicalSession, code: str, language: str, time_spent: int, hints_used: int) -> int:
	"""
	Evaluate a code submission using LLM with comprehensive criteria
	"""
	print(f"🔍 Starting evaluation for question {session.current_question_index + 1}")
	print(f"🔍 Code length: {len(code)}, Language: {language}, Time: {time_spent/1000:.1f}s, Hints: {hints_used}")
	
	if not client:
		print("❌ Groq client not available, using fallback evaluation")
		return evaluate_code_submission_fallback(session, code, language, time_spent, hints_used)
	
	current_question = session.get_current_question()
	print(f"🎯 Evaluating against question: {current_question['question'][:50]}...")
	
	# Prepare evaluation context
	evaluation_prompt = f"""
You are a technical interviewer. Evaluate this code submission and respond with ONLY valid JSON (no markdown, no extra text).

Question: {current_question['question']}
Candidate's Code ({language}):
{code}

Context:
- Time: {time_spent/1000:.1f}s, Hints: {hints_used}, Approach discussed: {session.approach_discussed}

Scoring (0-100 total):
- Correctness: 0-25 points
- Approach discussion: -10 if none, +5 if good
- Time penalty: -1 per minute over 10min
- Hint penalty: -5 per hint
- Code quality: 0-15 points
- Understanding: 0-10 points

Respond exactly like this:
{{
    "score": 75,
    "feedback": "Brief overall assessment",
    "correctness": "Brief correctness assessment",
    "approach_quality": "Brief approach assessment", 
    "code_quality": "Brief code quality assessment",
    "areas_for_improvement": ["issue1", "issue2"]
}}
"""

	print(f"📤 Sending evaluation prompt to LLM...")

	try:
		response = client.chat.completions.create(
			model="llama-3.3-70b-versatile",
			messages=[
				{"role": "system", "content": "You are a technical interviewer. Always respond with valid JSON only. Never use markdown formatting."},
				{"role": "user", "content": evaluation_prompt}
			],
			temperature=0.2,
			max_tokens=400
		)
		
		response_content = response.choices[0].message.content
		print(f"📥 Evaluation Response Length: {len(response_content) if response_content else 0}")
		print(f"📥 Evaluation Response Preview: {response_content[:100] if response_content else 'EMPTY'}...")
		
		if not response_content or response_content.strip() == "":
			print("❌ Empty response from LLM")
			return evaluate_code_submission_fallback(session, code, language, time_spent, hints_used)
		
		print(f"🔍 Raw LLM evaluation response: {response_content}")  # Full debug logging
		
		import json
		
		# Multi-layer JSON parsing strategy
		evaluation = None
		
		# Layer 1: Direct parsing
		try:
			evaluation = json.loads(response_content.strip())
		except json.JSONDecodeError:
			# Layer 2: Extract and repair JSON
			try:
				extracted = extract_json_from_response(response_content)
				repaired = repair_json_string(extracted)
				evaluation = json.loads(repaired)
			except json.JSONDecodeError:
				# Layer 3: Manual cleanup and retry
				try:
					cleaned = response_content.strip()
					# Remove any text before first {
					if '{' in cleaned:
						cleaned = cleaned[cleaned.find('{'):]
					# Remove any text after last }
					if '}' in cleaned:
						cleaned = cleaned[:cleaned.rfind('}')+1]
					# Remove markdown and repair
					cleaned = repair_json_string(cleaned)
					evaluation = json.loads(cleaned)
				except json.JSONDecodeError as final_error:
					print(f"JSON decode error: {final_error}")
					print(f"Raw response: {response_content}")
					return evaluate_code_submission_fallback(session, code, language, time_spent, hints_used)
		
		if evaluation:
			score = evaluation.get("score", 70)
			if not isinstance(score, (int, float)) or score < 0 or score > 100:
				print(f"Invalid score from LLM: {score}")
				return evaluate_code_submission_fallback(session, code, language, time_spent, hints_used)
			
			# Store detailed evaluation in session for results
			session.final_evaluation = evaluation
			return int(score)
			
	except Exception as e:
		print(f"Error in LLM evaluation: {e}")
		# Fallback to basic evaluation
		return evaluate_code_submission_fallback(session, code, language, time_spent, hints_used)


def evaluate_code_submission_fallback(session: TechnicalSession, code: str, language: str, time_spent: int, hints_used: int) -> int:
	"""
	Fallback evaluation method if LLM fails
	"""
	base_score = 70
	
	# Approach discussion bonus/penalty
	if not session.approach_discussed:
		base_score -= 15  # Significant penalty for not discussing approach
	elif len(session.voice_responses) > 0:
		base_score += 5  # Bonus for good approach discussion
	
	# Time penalty (more strict)
	time_minutes = time_spent / 60000
	if time_minutes > 10:
		base_score -= min(15, (time_minutes - 10) * 2)
	
	# Hint penalty (increased)
	base_score -= hints_used * 7
	
	# Code quality bonus
	quality_bonus = 0
	if len(code.strip()) > 50:
		quality_bonus += 5
	if 'def ' in code or 'function ' in code or 'class ' in code:
		quality_bonus += 8
	if any(keyword in code.lower() for keyword in ['if', 'else', 'for', 'while']):
		quality_bonus += 5
		
	final_score = max(0, min(100, base_score + quality_bonus))
	return final_score


async def analyze_approach_discussion(session: TechnicalSession, transcript: str) -> str:
	"""
	Analyze the quality of approach discussion using LLM
	"""
	if not client:
		print("Groq client not available, using fallback approach analysis")
		return "Good start on explaining your approach. Consider discussing time complexity and edge cases for a more complete analysis."
	
	current_question = session.get_current_question()
	
	analysis_prompt = f"""
Analyze the candidate's approach discussion for this technical interview question.

Question: {current_question['question']}
Topics: {current_question['topics']}

Candidate's Approach Discussion:
"{transcript}"

Evaluate:
1. Problem understanding demonstrated
2. Approach clarity and correctness
3. Consideration of edge cases
4. Time/space complexity awareness
5. Alternative solutions mentioned

Provide constructive feedback (2-3 sentences) focusing on strengths and areas for improvement.
"""

	try:
		response = client.chat.completions.create(
			model="llama-3.3-70b-versatile",
			messages=[{"role": "user", "content": analysis_prompt}],
			temperature=0.4,
			max_tokens=300
		)
		
		response_content = response.choices[0].message.content
		if not response_content or response_content.strip() == "":
			print("Empty response from LLM for approach analysis")
			return "Good start on explaining your approach. Consider discussing time complexity and edge cases for a more complete analysis."
		
		return response_content.strip()
	except Exception as e:
		print(f"Error in approach analysis: {e}")
		return "Good start on explaining your approach. Consider discussing time complexity and edge cases for a more complete analysis."


async def generate_smart_hint(session: TechnicalSession, question_data: dict, current_code: str, language: str) -> str:
	"""
	Generate contextual hints using LLM based on current progress
	"""
	if not client:
		print("Groq client not available, using fallback hint generation")
		return generate_hint_fallback(question_data, current_code, language, session.hints_used)
	hint_prompt = f"""
You are helping a candidate in a technical interview. They've asked for a hint.

Question: {question_data['question']}
Topics: {question_data['topics']}
Hints used so far: {session.hints_used}

Current Code ({language}):
```{language}
{current_code}
```

Previous hints given: {session.hints_used}
Approach discussed: {session.approach_discussed}

Provide a helpful but not overly revealing hint. The hint should:
- Guide them toward the right direction without giving away the solution
- Be appropriate for their current progress level
- Become more specific if they've used multiple hints already
- Encourage them to think about the approach if they haven't discussed it

Keep the hint to 1-2 sentences.
"""

	try:
		response = client.chat.completions.create(
			model="llama-3.3-70b-versatile",
			messages=[{"role": "user", "content": hint_prompt}],
			temperature=0.6,
			max_tokens=200
		)
		
		response_content = response.choices[0].message.content
		if not response_content or response_content.strip() == "":
			print("Empty response from LLM for hint generation")
			return generate_hint_fallback(question_data, current_code, language, session.hints_used)
		
		return response_content.strip()
	except Exception as e:
		print(f"Error generating hint: {e}")
		return generate_hint_fallback(question_data, current_code, language, session.hints_used)


def generate_hint_fallback(question_data: dict, current_code: str, language: str, hints_used: int) -> str:
	"""
	Fallback hint generation if LLM fails
	"""
	topics = question_data.get('topics', [])
	hints = question_data.get('hints', [])
	
	# Use pre-generated hints if available
	if hints and hints_used <= len(hints):
		return hints[min(hints_used, len(hints) - 1)]
	
	# Generic progressive hints
	if hints_used == 1:
		return "Think about what data structure would be most efficient for this problem."
	elif hints_used == 2:
		return "Consider the time complexity of your current approach. Can it be optimized?"
	elif hints_used >= 3:
		return "Focus on the core algorithm. Try writing pseudocode first, then implement step by step."
	
	return "Break the problem down into smaller steps and tackle each one systematically."


# ---------------
# Uvicorn helper
# ---------------
def get_app():
	return app

