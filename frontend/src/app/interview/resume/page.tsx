'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Mic, CheckCircle, Loader2, Play, ArrowLeft, Camera, CameraOff, Code2, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function ResumeInterviewPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [phase, setPhase] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [resumeInfo, setResumeInfo] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cameraSize, setCameraSize] = useState({ width: 320, height: 240 });
  const [isResizingCamera, setIsResizingCamera] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  
  // Code editor states
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);

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
      
      // Ensure video element gets the stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Force video to play
        videoRef.current.play().catch(console.error);
      }
      
      addLog('Camera started successfully');
    } catch (error) {
      console.error('Error accessing camera:', error);
      addLog('Camera access denied or not available');
      setIsCameraOn(false);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 280 && newWidth <= 600) {
      setChatPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Camera drag handlers
  const handleCameraDragStart = (e: React.MouseEvent) => {
    if (!cameraRef.current) return;
    const rect = cameraRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCameraDragMove = (e: MouseEvent) => {
    if (!isDragging || !cameraRef.current) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport bounds
    const maxX = window.innerWidth - cameraSize.width;
    const maxY = window.innerHeight - cameraSize.height;
    
    setCameraPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleCameraDragEnd = () => {
    setIsDragging(false);
  };

  // Camera resize handlers
  const handleCameraResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dragging when resizing
    setIsResizingCamera(true);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ width: cameraSize.width, height: cameraSize.height });
  };

  const handleCameraResizeMove = (e: MouseEvent) => {
    if (!isResizingCamera) return;
    
    const deltaX = e.clientX - resizeStartPos.x;
    const deltaY = e.clientY - resizeStartPos.y;
    
    const newWidth = Math.max(200, Math.min(800, resizeStartSize.width + deltaX));
    const newHeight = Math.max(150, Math.min(600, resizeStartSize.height + deltaY));
    
    setCameraSize({ width: newWidth, height: newHeight });
  };

  const handleCameraResizeEnd = () => {
    setIsResizingCamera(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleCameraDragMove);
      document.addEventListener('mouseup', handleCameraDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleCameraDragMove);
        document.removeEventListener('mouseup', handleCameraDragEnd);
      };
    }
  }, [isDragging, dragOffset, cameraSize]);

  useEffect(() => {
    if (isResizingCamera) {
      document.addEventListener('mousemove', handleCameraResizeMove);
      document.addEventListener('mouseup', handleCameraResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleCameraResizeMove);
        document.removeEventListener('mouseup', handleCameraResizeEnd);
      };
    }
  }, [isResizingCamera, resizeStartPos, resizeStartSize]);

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
      // Don't show "WS connected" in chat
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      // Don't show "WS closed" in chat
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } catch {}
      setPhaseStatus('');
    };

    wsRef.current.onerror = (e) => {
      setIsConnecting(false);
      // Don't show "WS error occurred" in chat
    };

    wsRef.current.onmessage = (ev) => {
      try {
        const msg: WebSocketMessage = JSON.parse(ev.data);
        
        if (msg.type === 'ready') {
          // Don't show "READY:" in chat - only process question
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
          // Don't show evaluation, hint, or final_feedback in UI - only store in backend JSON
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
        } else if (msg.type === 'listening') {
          // Don't show "LISTENING:" in chat - only set phase
          setPhaseStatus('Listening...');
        } else if (msg.type === 'transcribed') {
          // Don't show "TRANSCRIBED:" in chat - only set answer
          setAnswer(msg.transcript || '');
          setPhaseStatus('');
        } else if (msg.type === 'no_speech') {
          // Don't show "NO SPEECH:" in chat - only reset phase
          setPhaseStatus('');
        } else if (msg.type === 'invalid_transcript') {
          // Don't show "INVALID:" in chat - only reset phase
          setPhaseStatus('');
        } else if (msg.type === 'ended') {
          // Don't show "ENDED" in chat
          setPhaseStatus('');
          // Check if we have interview results
          if (msg.interview_id && msg.download_url) {
            // Save results info to localStorage for results page
            const resultsData = {
              interview_id: msg.interview_id,
              download_url: `http://127.0.0.1:8000${msg.download_url}`,
              timestamp: new Date().toISOString(),
              interview_type: 'resume'
            };
            localStorage.setItem('interviewResults', JSON.stringify(resultsData));
          }
          // Redirect to results page
          router.push('/interview/results');
        } else if (msg.type === 'error') {
          // Don't show "ERROR:" in chat - only reset phase
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

  const uploadResume = async () => {
    if (!resumeFile) {
      addLog('Select a PDF first');
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', resumeFile);
    
    try {
      const resp = await fetch(HTTP_BASE + '/upload_resume', {
        method: 'POST',
        body: formData
      });
      
      if (!resp.ok) {
        addLog('Upload failed: ' + resp.status);
        setIsUploading(false);
        return;
      }
      
      const data = await resp.json();
      setResumeId(data.resume_id);
      setResumeInfo(`Resume uploaded successfully (${data.pages} pages)`);
      // Don't show "Resume uploaded. id=" in chat
      setIsUploading(false);
    } catch (e) {
      // Don't show "Upload error:" in chat - just reset uploading state
      setIsUploading(false);
    }
  };

  const initResumeInterview = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      // Don't show "Connect WS first" in chat
      return;
    }
    if (!resumeId) {
      addLog('Upload resume first');
      return;
    }
    wsRef.current.send(JSON.stringify({ 
      type: 'init', 
      mode: 'resume', 
      resume_id: resumeId 
    }));
    addLog('Init (resume)');
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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    }
    
    // Stop camera and save session data
    stopCamera();
    
    // Save minimal session data to localStorage (avoid quota exceeded error)
    const sessionData = {
      interviewType: 'resume',
      timestamp: new Date().toISOString(),
      messages: logs.slice(-20) // Keep only last 20 messages to avoid storage quota
    };
    
    try {
      localStorage.setItem('lastInterviewSession', JSON.stringify(sessionData));
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e);
      // Continue without saving - the results page will handle missing data
    }
    
    // Redirect to results page
    router.push('/interview/results');
  };

  useEffect(() => {
    // Auto-connect when component mounts
    connectWebSocket();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle video stream assignment
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  if (!interviewStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6"
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-12"
          >
            <Link href="/interview" className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors mb-6">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Selection</span>
            </Link>
            
            <div className="flex items-center justify-center space-x-2 mb-6">
              <FileText className="w-10 h-10 text-green-600" />
              <span className="text-3xl font-bold">
                Code<span className="text-green-600">Win</span>
              </span>
            </div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4"
            >
              Resume-based
              <span className="block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Interview
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Upload your resume to get personalized questions based on your experience and projects
            </motion.p>
          </motion.div>

          {/* Resume Upload */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center justify-center space-x-2">
              <FileText className="w-6 h-6 text-green-600" />
              <span>Upload Your Resume</span>
            </h3>
            
            <div className="space-y-6">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                />
                <p className="text-sm text-gray-500 mt-3">
                  Upload your PDF resume (Max 10MB)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: PDF only
                </p>
              </div>
              
              {/* Selected File Display */}
              {resumeFile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700">{resumeFile.name}</p>
                      <p className="text-xs text-green-600">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={uploadResume}
                    disabled={isUploading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
              
              {/* Upload Success */}
              {resumeInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium text-blue-700">{resumeInfo}</p>
                  </div>
                </motion.div>
              )}
              
              {/* Start Interview Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={initResumeInterview}
                disabled={!resumeId || !isConnected}
                className="w-full px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              >
                <Play className="w-5 h-5" />
                <span>Start Resume Interview</span>
              </motion.button>
            </div>

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
                    <Loader2 className="w-5 h-5 animate-spin text-green-500" />
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
    <div className="min-h-screen bg-gray-900 flex">
      {/* Main Video Area - Left Side */}
      <div className="flex-1 relative" style={{ width: `calc(100% - ${chatPanelWidth}px)` }}>
        {/* Video Stream */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
          {/* Center Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold">AI</span>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Interview in Progress</h2>
                <p className="text-gray-300">Having a conversation with CodeSage AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Preview Box - Google Meet Style - Draggable & Resizable */}
        <div 
          ref={cameraRef}
          className="absolute z-10 cursor-move"
          style={{
            left: cameraPosition.x || 'auto',
            top: cameraPosition.y || 'auto',
            right: cameraPosition.x ? 'auto' : '24px',
            bottom: cameraPosition.y ? 'auto' : '80px',
            width: cameraSize.width,
            height: cameraSize.height
          }}
          onMouseDown={handleCameraDragStart}
        >
          <div className={`relative w-full h-full rounded-xl overflow-hidden transition-all duration-300 ${
            phase === 'Listening...' 
              ? 'ring-4 ring-green-400 shadow-lg shadow-green-400/50' 
              : 'ring-2 ring-gray-600'
          } ${isDragging ? 'shadow-2xl scale-105' : ''}`}>
            {/* Drag Handle */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-black/20 flex items-center justify-center cursor-move z-20">
              <div className="w-8 h-1 bg-white/40 rounded-full"></div>
            </div>
            
            {/* Resize Handle */}
            <div 
              className="absolute bottom-0 right-0 w-4 h-4 bg-white/20 cursor-se-resize z-20 hover:bg-white/40 transition-colors"
              onMouseDown={handleCameraResizeStart}
              style={{ 
                clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)',
                borderTopLeftRadius: '4px'
              }}
            ></div>
            
            {isCameraOn && cameraStream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  onLoadedData={() => console.log('Video loaded')}
                  onError={(e) => console.error('Video error:', e)}
                />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                  You
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center border-2 border-gray-600 rounded-xl">
                <div className="text-center text-gray-400">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs">Camera Off</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-gray-800/90 backdrop-blur-md rounded-full px-6 py-3 shadow-lg">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleCamera}
            className={`p-3 rounded-full transition-colors ${
              isCameraOn 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            }`}
          >
            {isCameraOn ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={endInterview}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium"
          >
            End Interview
          </motion.button>
        </div>

        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-md rounded-full px-4 py-2">
              <FileText className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">CodeWin - Resume Interview</span>
            </div>
            
            <div className="flex items-center space-x-2 bg-green-500/20 backdrop-blur-md rounded-full px-3 py-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-medium">AI Connected</span>
            </div>
          </div>
        </div>

        {/* User Name Label */}
        <div className="absolute bottom-20 left-6">
          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-medium">
            You
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        className={`w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors ${
          isResizing ? 'bg-blue-500' : ''
        }`}
      />

      {/* Right Side - Chat Transcript Panel */}
      <div className="bg-white flex flex-col" style={{ width: `${chatPanelWidth}px` }}>
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Live Transcript</h3>
            {phase && (
              <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {phase === 'Listening...' && <Loader2 className="w-4 h-4 animate-spin" />}
                {phase === 'Speaking...' && <Mic className="w-4 h-4" />}
                <span>{phase}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {logs.map((log, index) => {
            const isQuestion = log.startsWith('Q:');
            const isEvaluation = log.startsWith('Evaluation:');
            const isHint = log.startsWith('Hint:');
            const isTranscribed = log.startsWith('TRANSCRIBED:');
            const isUser = isTranscribed;
            
            // Clean up the message text
            let cleanMessage = log;
            if (isQuestion) cleanMessage = log.replace('Q: ', '');
            if (isEvaluation) cleanMessage = log.replace('Evaluation: ', '');
            if (isHint) cleanMessage = log.replace('Hint: ', '');
            if (isTranscribed) cleanMessage = log.replace('TRANSCRIBED: ', '');

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                  isUser 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {!isUser && (
                    <div className="text-xs text-gray-500 mb-1 font-medium">
                      Alex
                    </div>
                  )}
                  <p className={`text-sm ${isUser ? 'text-white' : 'text-gray-900'}`}>
                    {cleanMessage}
                  </p>
                  {isUser && (
                    <div className="text-xs text-blue-100 mt-1 text-right">
                      Aaron Wang
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={logsEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          {showCodeEditor ? (
            /* Code Editor Mode */
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Code Editor</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Write your code here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                rows={10}
                style={{ fontFamily: 'Monaco, Consolas, "Lucida Console", monospace' }}
              />
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={submitCode}
                  disabled={!code.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Code</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCode('')}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Clear
                </motion.button>
              </div>
            </div>
          ) : (
            /* Regular Text Input Mode */
            <div className="flex space-x-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={2}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendAnswer}
                disabled={!answer.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed self-end"
              >
                Send
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}