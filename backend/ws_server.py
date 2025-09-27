import os
import json
import uuid
import tempfile
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Import all functions from existing modules
from utils import TOPIC_OPTIONS, build_interviewer_prompt, record_with_vad
from interview import transcript_is_valid, transcribe, interviewer_reply, INTERVIEWER_PROMPT
from interview_with_resume import read_resume


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
"""
This server only wires WebSocket connectivity. All interview logic (prompts, LLM calls)
is delegated to the existing functions in interview.py and interview_with_resume.py.
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


# ---------------
# Uvicorn helper
# ---------------
def get_app():
	return app

