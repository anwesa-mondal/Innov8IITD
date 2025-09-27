'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Mic, CheckCircle, Loader2, Play, ArrowLeft, MessageSquare, Bot, User, Zap, Activity, Send, Camera, CameraOff, PlayCircle, Square } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';

interface WebSocketMessage {
  type: string;
  message?: string;
  next_question?: string;
  evaluation?: string;
  hint?: string;
  final_feedback?: string;
  transcript?: string;
  error?: string;
  topics?: string[];
  interview_id?: string;
  download_url?: string;
  code_feedback?: string;
  question_complete?: boolean;
  score?: number;
}

interface Question {
  id: number;
  question: string;
  code: string;
  score?: number;
  timeSpent: number;
  hintsUsed: number;
  completed: boolean;
}

export default function TechnicalInterviewPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [phase, setPhase] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [interviewStarted, setInterviewStarted] = useState(false);
  
  // Enhanced code editor states
  const [code, setCode] = useState('// Write your solution here\n');
  const [language, setLanguage] = useState('python');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [hintTimer, setHintTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoHintEnabled, setAutoHintEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const HTTP_BASE = 'http://127.0.0.1:8000';
  const WS_URL = 'ws://127.0.0.1:8000/ws/technical';

  // Navigation handlers for Navbar
  const handleTakeInterview = () => {
    router.push('/interview');
  };

  const handleViewResults = () => {
    router.push('/interview/results');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');

        if (event.results[event.results.length - 1].isFinal) {
          handleVoiceInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Auto hint timer - gives hint every 30 seconds
  useEffect(() => {
    if (interviewStarted && autoHintEnabled && currentQuestion) {
      if (hintTimer) clearTimeout(hintTimer);
      
      const timer = setTimeout(() => {
        requestHint();
      }, 30000); // 30 seconds

      setHintTimer(timer);
      
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, interviewStarted, autoHintEnabled]);

  const handleVoiceInput = (transcript: string) => {
    if (transcript.toLowerCase().includes('hint') || transcript.toLowerCase().includes('help')) {
      requestHint();
    }
  };

  const requestHint = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    setHintsUsed(prev => prev + 1);
    wsRef.current.send(JSON.stringify({
      type: 'request_hint',
      question: currentQuestion,
      code: code,
      language: language
    }));
  };

  const startVoiceRecognition = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  const submitCode = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const timeSpent = Date.now() - questionStartTime;
    
    wsRef.current.send(JSON.stringify({
      type: 'submit_code',
      question: currentQuestion,
      code: code,
      language: language,
      time_spent: timeSpent,
      hints_used: hintsUsed
    }));
  };

  const getLanguageTemplate = (lang: string): string => {
    switch (lang) {
      case 'python':
        return '# Write your solution here\ndef solution():\n    pass\n\n# Test your solution\nif __name__ == "__main__":\n    print(solution())';
      case 'java':
        return 'public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}';
      case 'cpp':
        return '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}';
      default:
        return '// Write your solution here\n';
    }
  };

  const changeLanguage = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCode(getLanguageTemplate(newLanguage));
  };

  const connectWebSocket = async (selectedTopics: string[]) => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setPhase('Connecting to interview system...');
    addLog('Initializing technical interview...');

    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        addLog('Connected successfully!');
        setIsConnected(true);
        setIsConnecting(false);
        setInterviewStarted(true);
        setQuestionStartTime(Date.now());
        
        // Initialize technical interview
        ws.send(JSON.stringify({
          type: 'init_technical',
          topics: selectedTopics
        }));
      };

      ws.onmessage = (event) => {
        const data: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onclose = () => {
        addLog('Connection closed');
        setIsConnected(false);
        setInterviewStarted(false);
      };

      ws.onerror = (error) => {
        addLog('Connection error: ' + error);
        setIsConnecting(false);
      };

      wsRef.current = ws;
    } catch (error) {
      addLog('Failed to connect: ' + error);
      setIsConnecting(false);
    }
  };

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'question':
        setCurrentQuestion(data.next_question || '');
        setQuestionStartTime(Date.now());
        setHintsUsed(0);
        setCode(getLanguageTemplate(language));
        addLog(`New Question: ${data.next_question}`);
        speakText(data.next_question || '');
        break;
        
      case 'hint':
        addLog(`Hint: ${data.hint}`);
        speakText(data.hint || '');
        break;
        
      case 'code_feedback':
        addLog(`Feedback: ${data.code_feedback}`);
        speakText(data.code_feedback || '');
        break;
        
      case 'question_complete':
        const timeSpent = Date.now() - questionStartTime;
        const newQuestion: Question = {
          id: currentQuestionIndex + 1,
          question: currentQuestion,
          code: code,
          score: data.score,
          timeSpent: timeSpent,
          hintsUsed: hintsUsed,
          completed: true
        };
        
        setQuestions(prev => [...prev, newQuestion]);
        setCurrentQuestionIndex(prev => prev + 1);
        
        if (data.next_question) {
          setCurrentQuestion(data.next_question);
          setQuestionStartTime(Date.now());
          setHintsUsed(0);
          setCode(getLanguageTemplate(language));
          addLog(`Next Question: ${data.next_question}`);
          speakText(data.next_question);
        }
        break;
        
      case 'interview_complete':
        addLog('Technical interview completed!');
        speakText(data.final_feedback || 'Interview completed!');
        saveInterviewResults();
        break;
        
      case 'error':
        addLog(`Error: ${data.error}`);
        break;
    }
  };

  const saveInterviewResults = async () => {
    const results = {
      interview_type: 'technical',
      timestamp: new Date().toISOString(),
      questions: questions,
      total_score: questions.reduce((sum, q) => sum + (q.score || 0), 0),
      average_time: questions.reduce((sum, q) => sum + q.timeSpent, 0) / questions.length,
      total_hints: questions.reduce((sum, q) => sum + q.hintsUsed, 0)
    };

    try {
      const response = await fetch(`${HTTP_BASE}/save_interview_results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog('Results saved successfully!');
        // Redirect to results page after 3 seconds
        setTimeout(() => {
          router.push(`/interview/results?id=${data.interview_id}`);
        }, 3000);
      }
    } catch (error) {
      addLog('Failed to save results: ' + error);
    }
  };

  const speakText = (text: string) => {
    if (!text || !text.trim()) return;
    
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        setIsSpeaking(true);
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  };

  // Show topic selection if not started
  if (!interviewStarted) {
    return (
      <>
        <Navbar 
          onTakeInterview={handleTakeInterview}
          onViewResults={handleViewResults}
          onGoHome={handleGoHome}
          theme="dark"
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6"
          style={{ paddingTop: '80px' }}
        >
          <div className="max-w-4xl mx-auto">
            <motion.div className="text-center mb-12">
              <motion.h1 
                className="text-5xl font-bold text-white mb-4"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
              >
                Technical Interview
              </motion.h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Select topics for your coding interview. You'll solve problems with our smart code editor.
              </p>
            </motion.div>

            <motion.div 
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-2xl font-semibold text-white mb-6">Choose Topics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  'Data Structures', 'Algorithms', 'Dynamic Programming', 
                  'System Design', 'Object-Oriented Design', 'Database Design'
                ].map((topic) => (
                  <motion.label
                    key={topic}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center space-x-3 p-4 rounded-xl cursor-pointer transition-all ${
                      selectedTopics.includes(topic)
                        ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(topic)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTopics([...selectedTopics, topic]);
                        } else {
                          setSelectedTopics(selectedTopics.filter(t => t !== topic));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="font-medium">{topic}</span>
                  </motion.label>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(6, 182, 212, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => connectWebSocket(selectedTopics)}
                disabled={selectedTopics.length === 0 || isConnecting}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Starting Interview...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5" />
                    <span>Start Technical Interview</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </>
    );
  }

  // Main technical interview interface
  return (
    <>
      <Navbar 
        onTakeInterview={handleTakeInterview}
        onViewResults={handleViewResults}
        onGoHome={handleGoHome}
        theme="dark"
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4" style={{ paddingTop: '80px' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center space-x-3">
              <Code2 className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Technical Interview</h1>
                <p className="text-sm text-gray-300">Question {currentQuestionIndex + 1}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <motion.div className="flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">Live</span>
              </motion.div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={requestHint}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 transition-all"
              >
                Get Hint ({hintsUsed})
              </motion.button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Question Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <span>Problem Statement</span>
              </h2>
              
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-gray-200 leading-relaxed">
                  {currentQuestion || 'Waiting for question...'}
                </p>
              </div>

              {/* Voice Controls */}
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                  className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                    isListening
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}
                >
                  <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
                  <span>{isListening ? 'Stop Listening' : 'Voice Input'}</span>
                </motion.button>

                <div className="text-xs text-gray-400 text-center">
                  Say "hint" or "help" for assistance
                </div>
              </div>

              {/* Interview Log */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-3">Interview Log</h3>
                <div className="bg-black/20 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="text-sm text-gray-300 mb-2 last:mb-0">
                      {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </motion.div>

            {/* Code Editor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <Code2 className="w-5 h-5 text-cyan-400" />
                  <span>Code Editor</span>
                </h2>
                
                {/* Language Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">Language:</span>
                  <select
                    value={language}
                    onChange={(e) => changeLanguage(e.target.value)}
                    className="bg-black/20 text-white border border-white/20 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </div>

              {/* Code Input Area */}
              <div className="relative">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-96 bg-black/40 text-gray-100 font-mono text-sm p-4 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  placeholder="Write your solution here..."
                  spellCheck={false}
                />
                
                {/* Line Numbers */}
                <div className="absolute left-2 top-4 text-gray-500 text-sm font-mono select-none pointer-events-none">
                  {code.split('\n').map((_, index) => (
                    <div key={index} className="leading-5">
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Activity className="w-4 h-4" />
                  <span>Hints used: {hintsUsed}</span>
                  <span>•</span>
                  <span>Time: {Math.floor((Date.now() - questionStartTime) / 1000)}s</span>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(6, 182, 212, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={submitCode}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Solution</span>
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Interview Progress</span>
              <span>{questions.length} questions completed</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((questions.length / 5) * 100, 100)}%` }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}