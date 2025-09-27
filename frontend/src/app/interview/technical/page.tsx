'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Mic, CheckCircle, Loader2, Play, ArrowLeft, MessageSquare, Bot, User, Zap, Activity, Send, Camera, CameraOff } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
}

export default function TechnicalInterviewPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [phase, setPhase] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // Code editor states
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const HTTP_BASE = 'http://127.0.0.1:8000';
  const WS_URL = 'ws://127.0.0.1:8000/ws';

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const setPhaseStatus = (text: string) => {
    setPhase(text);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      setCameraStream(stream);
      setIsCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      addLog('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraOn(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const startServerVAD = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setPhaseStatus('Listening...');
    wsRef.current.send(JSON.stringify({ type: 'record_audio' }));
  };

  const speakAndThenRecord = (text: string) => {
    if (!text || !text.trim()) return;
    setPhaseStatus('Speaking...');
    try {
      if (!('speechSynthesis' in window)) {
        setTimeout(startServerVAD, 400);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        startServerVAD();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        startServerVAD();
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsSpeaking(false);
      startServerVAD();
    }
  };

  const connectWebSocket = async () => {
    setIsConnecting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    wsRef.current = new WebSocket(WS_URL);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      addLog('WS connected');
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      addLog('WS closed');
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } catch {}
      setPhaseStatus('');
    };

    wsRef.current.onerror = (e) => {
      setIsConnecting(false);
      addLog('WS error occurred');
    };

    wsRef.current.onmessage = (ev) => {
      try {
        const msg: WebSocketMessage = JSON.parse(ev.data);
        
        if (msg.type === 'ready') {
          addLog('READY: ' + (msg.message || ''));
          if (msg.next_question) {
            addLog('Q: ' + msg.next_question);
            
            // Check if this is a coding question
            const isCodingQuestion = /write.*code|implement|function|algorithm|program|solve.*problem|code.*solution/i.test(msg.next_question);
            setIsCodeMode(isCodingQuestion);
            setShowCodeEditor(isCodingQuestion);
            
            if (isCodingQuestion) {
              setPhaseStatus('Please write your code and click Submit when ready');
              // For coding questions, don't auto-start recording
            } else {
              speakAndThenRecord(msg.next_question);
            }
          }
        } else if (msg.type === 'assessment') {
          if (msg.evaluation) addLog('Evaluation: ' + msg.evaluation);
          if (msg.hint) addLog('Hint: ' + msg.hint);
          if (msg.next_question) {
            addLog('Q: ' + msg.next_question);
            
            // Check if this is a coding question
            const isCodingQuestion = /write.*code|implement|function|algorithm|program|solve.*problem|code.*solution/i.test(msg.next_question);
            setIsCodeMode(isCodingQuestion);
            setShowCodeEditor(isCodingQuestion);
            
            if (isCodingQuestion) {
              setPhaseStatus('Please write your code and click Submit when ready');
              // For coding questions, don't auto-start recording
            } else {
              speakAndThenRecord(msg.next_question);
            }
          } else {
            setPhaseStatus('');
            setShowCodeEditor(false);
            setIsCodeMode(false);
          }
          if (msg.final_feedback) addLog('Final: ' + msg.final_feedback);
        } else if (msg.type === 'listening') {
          addLog('LISTENING: ' + msg.message);
          setPhaseStatus('Listening...');
        } else if (msg.type === 'transcribed') {
          addLog('TRANSCRIBED: ' + msg.transcript);
          setAnswer(msg.transcript || '');
          setPhaseStatus('');
        } else if (msg.type === 'no_speech') {
          addLog('NO SPEECH: ' + msg.message);
          setPhaseStatus('');
        } else if (msg.type === 'invalid_transcript') {
          addLog('INVALID: ' + msg.message + (msg.transcript ? (' | raw=' + msg.transcript) : ''));
          setPhaseStatus('');
        } else if (msg.type === 'ended') {
          addLog('ENDED');
          setPhaseStatus('');
          // Handle interview end with results
          if (msg.interview_id && msg.download_url) {
            // Redirect to results page with the interview ID
            router.push(`/interview/results?id=${msg.interview_id}&download_url=${encodeURIComponent(msg.download_url)}`);
          }
        } else if (msg.type === 'error') {
          addLog('ERROR: ' + msg.error);
          setPhaseStatus('');
        } else {
          addLog('MSG: ' + ev.data);
        }
      } catch (e) {
        addLog(ev.data);
      }
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const fetchTopics = async () => {
    try {
      const resp = await fetch(HTTP_BASE + '/topics');
      const data = await resp.json();
      setTopics(data.topics || []);
      addLog('Topics loaded: ' + (data.topics || []).join(', '));
    } catch (e) {
      addLog('Failed to load topics: ' + (e as Error).message);
    }
  };

  const initTopicsInterview = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('Connect WS first');
      return;
    }
    if (selectedTopics.length === 0) {
      addLog('Select at least one topic');
      return;
    }
    wsRef.current.send(JSON.stringify({ 
      type: 'init', 
      mode: 'topics', 
      topics: selectedTopics 
    }));
    addLog('Init (topics): ' + selectedTopics.join(', '));
    setInterviewStarted(true);
    // Auto-start camera when interview begins
    startCamera();
  };

  const sendAnswer = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('Connect WS first');
      return;
    }
    if (!answer.trim()) {
      addLog('Answer empty');
      return;
    }
    wsRef.current.send(JSON.stringify({ 
      type: 'answer', 
      text: answer 
    }));
    setAnswer('');
  };

  const submitCode = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('Connect WS first');
      return;
    }
    if (!code.trim()) {
      addLog('Code empty');
      return;
    }
    
    addLog('A: [Code Submitted]');
    setPhaseStatus('AI is analyzing your code...');
    
    wsRef.current.send(JSON.stringify({ 
      type: 'code_submission', 
      code: code 
    }));
    setCode('');
    setShowCodeEditor(false);
    setIsCodeMode(false);
  };

  const endInterview = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('Connect WS first');
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'end' }));
    // Auto-stop camera when interview ends
    stopCamera();
  };

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  useEffect(() => {
    // Auto-connect and fetch topics when component mounts
    const initializePage = async () => {
      await connectWebSocket();
      await fetchTopics();
    };
    initializePage();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      // Cleanup camera stream on unmount
      stopCamera();
    };
  }, []);

  if (!interviewStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6"
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-12"
          >
            <Link href="/interview" className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition-colors mb-6">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Selection</span>
            </Link>
            
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Code2 className="w-10 h-10 text-indigo-600" />
              <span className="text-3xl font-bold">
                Code<span className="text-indigo-600">Win</span>
              </span>
            </div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4"
            >
              Technical
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Interview
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Select the technical topics you'd like to practice with our AI interviewer
            </motion.p>
          </motion.div>

          {/* Topics Selection */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center justify-center space-x-2">
              <Code2 className="w-6 h-6 text-blue-600" />
              <span>Select Technical Topics</span>
            </h3>
            
            {topics.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8 max-h-80 overflow-y-auto">
                  {topics.map((topic) => (
                    <label key={topic} className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200 hover:border-indigo-300 transition-all">
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic)}
                        onChange={() => handleTopicToggle(topic)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{topic}</span>
                    </label>
                  ))}
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={initTopicsInterview}
                  disabled={selectedTopics.length === 0 || !isConnected}
                  className="w-full px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                >
                  <Play className="w-5 h-5" />
                  <span>Start Technical Interview</span>
                  <span className="text-sm opacity-75">({selectedTopics.length} topics selected)</span>
                </motion.button>
              </>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-gray-600 py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading topics...</span>
              </div>
            )}

            {/* Connection Status */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2">
                {isConnected ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600">Connected to AI Interviewer</span>
                  </>
                ) : isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    <span className="text-sm text-gray-600">Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-red-500" />
                    <span className="text-sm text-gray-600">Connection Failed</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Interview Console View
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center space-x-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <Code2 className="w-10 h-10 text-cyan-400" />
              <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-lg" />
            </motion.div>
            <div>
              <span className="text-3xl font-black text-white">
                Code<span className="text-cyan-400">Win</span>
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Technical Interview Active</span>
              </div>
            </div>
          </div>
          
          {/* Enhanced Connection Status */}
          <div className="flex items-center space-x-6">
            <motion.div 
              className="flex items-center space-x-3 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30"
              animate={{ 
                boxShadow: ["0 0 0 0 rgba(34, 197, 94, 0.4)", "0 0 0 10px rgba(34, 197, 94, 0)", "0 0 0 0 rgba(34, 197, 94, 0.4)"]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
              </motion.div>
              <span className="text-sm font-medium text-green-300">AI Connected</span>
            </motion.div>
            
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={endInterview}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
            >
              End Interview
            </motion.button>
          </div>
        </motion.div>

        {/* Split Layout: Camera + Interview Console */}
        <div className="flex space-x-6">
          {/* Left Side - Camera Stream */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-1/3 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-white/20 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Camera className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Video Preview</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleCamera}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCameraOn 
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30' 
                    : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30'
                }`}
              >
                {isCameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                <span>{isCameraOn ? 'Stop' : 'Start'}</span>
              </motion.button>
            </div>
            
            <div className="relative aspect-video bg-black/30">
              {isCameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-sm">Camera will start automatically</p>
                    <p className="text-xs text-gray-500 mt-1">when interview begins</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Side - Enhanced Interview Console */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          >
          {/* Console Header */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Interview Console</h3>
                <p className="text-sm text-gray-300">Real-time AI conversation</p>
              </div>
            </div>
            {phase && (
              <motion.div 
                className="flex items-center space-x-3 bg-indigo-500/20 px-4 py-2 rounded-full border border-indigo-500/30"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {phase === 'Listening...' && (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-5 h-5 text-indigo-400" />
                    </motion.div>
                    <span className="text-sm font-medium text-indigo-300">AI is listening...</span>
                  </>
                )}
                {phase === 'Speaking...' && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <Mic className="w-5 h-5 text-purple-400" />
                    </motion.div>
                    <span className="text-sm font-medium text-purple-300">AI is speaking...</span>
                  </>
                )}
              </motion.div>
            )}
          </div>
          
          {/* Enhanced Logs Section */}
          <div className="p-6">
            <div className="bg-black/30 rounded-xl p-4 h-80 overflow-y-auto mb-6 border border-white/10 relative">
              {/* Logs Header */}
              <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-white/10">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-gray-300">Conversation Log</span>
              </div>
              
              {/* Logs Content */}
              <div className="space-y-3 font-mono text-sm">
                {logs.map((log, index) => {
                  const isQuestion = log.startsWith('Q:');
                  const isReady = log.startsWith('READY:');
                  const isEvaluation = log.startsWith('Evaluation:');
                  const isHint = log.startsWith('Hint:');
                  const isTranscribed = log.startsWith('TRANSCRIBED:');
                  const isListening = log.startsWith('LISTENING:');
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start space-x-3 p-3 rounded-lg ${
                        isQuestion ? 'bg-blue-500/20 border-l-4 border-blue-400' :
                        isEvaluation ? 'bg-green-500/20 border-l-4 border-green-400' :
                        isHint ? 'bg-yellow-500/20 border-l-4 border-yellow-400' :
                        isTranscribed ? 'bg-purple-500/20 border-l-4 border-purple-400' :
                        isListening ? 'bg-indigo-500/20 border-l-4 border-indigo-400' :
                        'bg-white/5'
                      }`}
                    >
                      {isQuestion && <Bot className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />}
                      {isTranscribed && <User className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />}
                      {(isEvaluation || isHint) && <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />}
                      <span className={`${
                        isQuestion ? 'text-blue-300' :
                        isEvaluation ? 'text-green-300' :
                        isHint ? 'text-yellow-300' :
                        isTranscribed ? 'text-purple-300' :
                        'text-gray-300'
                      } leading-relaxed`}>
                        {log}
                      </span>
                    </motion.div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
              
              {/* Gradient Overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
            </div>
            
            {/* Enhanced Answer Input */}
            <div className="space-y-4">
              {showCodeEditor ? (
                /* Code Editor Mode */
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white">Code Editor</span>
                  </div>
                  <div className="relative">
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Write your code here..."
                      className="w-full px-4 py-4 bg-black/30 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none text-white placeholder-gray-400 backdrop-blur-sm font-mono text-sm"
                      rows={12}
                      style={{ fontFamily: 'Monaco, Consolas, "Lucida Console", monospace' }}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                      {code.length} characters
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 10px 25px -5px rgba(34, 197, 94, 0.4)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={submitCode}
                      disabled={!code.trim()}
                      className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                      <span>Submit Code</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCode('')}
                      className="px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
                    >
                      Clear
                    </motion.button>
                    <motion.button
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={endInterview}
                      className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                    >
                      End Interview
                    </motion.button>
                  </div>
                </div>
              ) : (
                /* Regular Text Input Mode */
                <>
                  <div className="relative">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer here (or speak and it will be filled automatically)..."
                      className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none text-white placeholder-gray-400 backdrop-blur-sm"
                      rows={4}
                    />
                    {/* Character count */}
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                      {answer.length} characters
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <motion.button
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={sendAnswer}
                      disabled={!answer.trim()}
                      className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                      <span>Send Answer</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={endInterview}
                      className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                    >
                      End Interview
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </motion.div>
  );
}