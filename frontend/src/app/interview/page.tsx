'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Code2, FileText, Play, Lightbulb, Headphones, Zap, ArrowRight, Loader2, Video, Mic, Upload, Bot, User, Star, Trophy, Target } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';

export default function InterviewPage() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();

  const connectWebSocket = async () => {
    setIsConnecting(true);
    
    // Add a small delay for animation effect
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsConnecting(false);
    setShowInstructions(false);
  };

  const selectInterviewType = async (selectedMode: 'topics' | 'resume') => {
    if (selectedMode === 'topics') {
      router.push('/interview/technical');
    } else {
      router.push('/interview/resume');
    }
  };

  // Navigation handlers for Navbar
  const handleTakeInterview = () => {
    // Already on interview page, do nothing or scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewResults = () => {
    router.push('/interview/results');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  // Instructions Screen Component
  const InstructionsScreen = () => {
    const instructions = [
      {
        icon: Headphones,
        title: "Voice Interaction",
        description: "The AI will speak questions to you, and automatically start listening for your response",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        iconBg: "bg-blue-100"
      },
      {
        icon: Code2,
        title: "Code Editor Integration", 
        description: "Write and execute code in real-time with syntax highlighting and multiple language support",
        color: "text-green-600",
        bgColor: "bg-green-50",
        iconBg: "bg-green-100"
      },
      {
        icon: Zap,
        title: "Real-Time Feedback",
        description: "Get instant evaluation and hints to improve your interview performance",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        iconBg: "bg-purple-100"
      }
    ];

    return (
      <>
        <Navbar 
          onTakeInterview={handleTakeInterview}
          onViewResults={handleViewResults}
          onGoHome={handleGoHome}
          theme="dark"
        />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50" style={{ paddingTop: '80px' }}>
          <div className="max-w-6xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6"
            >
              Welcome to Your
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Interview Platform
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed"
            >
              Experience a realistic interview environment with our advanced AI interviewer. 
              Practice coding problems, behavioral questions, and get instant feedback.
            </motion.p>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          >
            {instructions.map((instruction, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.1)" 
                }}
                className={`${instruction.bgColor} p-8 rounded-2xl border border-white/50 backdrop-blur-sm`}
              >
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className={`inline-flex items-center justify-center w-16 h-16 ${instruction.iconBg} rounded-2xl mb-6 shadow-lg`}
                >
                  <instruction.icon className={`w-8 h-8 ${instruction.color}`} />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {instruction.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {instruction.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Launch Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="text-center"
          >
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px -10px rgba(79, 70, 229, 0.4)"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={connectWebSocket}
              disabled={isConnecting}
              className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all overflow-hidden"
            >
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                whileHover={{ x: 0, opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"
              />
              <span className="relative z-10 flex items-center space-x-3">
                {isConnecting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Launching Interview Environment...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    <span>Launch Interview Environment</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </motion.button>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="text-slate-500 mt-4 flex items-center justify-center space-x-2"
            >
              <Mic className="w-4 h-4" />
              <span>Make sure your microphone is enabled for the best experience</span>
            </motion.p>
          </motion.div>
        </div>
        </div>
      </>
    );
  };

  // Selection Screen Component
  const SelectionScreen = () => {
    const interviewTypes = [
      {
        id: 'topics',
        icon: Code2,
        title: 'Technical Interview',
        description: 'Practice coding problems, algorithms, and technical questions with our AI interviewer',
        features: ['Data Structures & Algorithms', 'System Design', 'Coding Challenges', 'Technical Discussions'],
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200 hover:border-blue-400'
      },
      {
        id: 'resume',
        icon: FileText,
        title: 'Resume-based Interview',
        description: 'Upload your resume and get personalized questions based on your experience and projects',
        features: ['Project Deep-dives', 'Experience Questions', 'Skill Assessment', 'Behavioral Scenarios'],
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200 hover:border-green-400'
      }
    ];

    return (
      <>
        <Navbar 
          onTakeInterview={handleTakeInterview}
          onViewResults={handleViewResults}
          onGoHome={handleGoHome}
          theme="dark"
        />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50" style={{ paddingTop: '80px' }}>
        <div className="max-w-6xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6"
            >
              Choose Your
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Interview Style
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed"
            >
              Select the interview format that best matches your preparation goals
            </motion.p>
          </motion.div>

          {/* Interview Type Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16"
          >
            {interviewTypes.map((type, index) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 25px 50px -10px rgba(0, 0, 0, 0.1)"
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectInterviewType(type.id as 'topics' | 'resume')}
                className={`${type.bgColor} p-8 rounded-2xl border-2 ${type.borderColor} cursor-pointer transition-all group backdrop-blur-sm`}
              >
                {/* Icon and Title */}
                <div className="flex items-center space-x-4 mb-6">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className={`w-16 h-16 bg-gradient-to-r ${type.color} rounded-2xl flex items-center justify-center shadow-lg`}
                  >
                    <type.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                      {type.title}
                    </h3>
                    <motion.div
                      initial={{ width: 0 }}
                      whileHover={{ width: '100%' }}
                      className={`h-1 bg-gradient-to-r ${type.color} rounded-full mt-1`}
                    />
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-600 leading-relaxed mb-6 text-lg">
                  {type.description}
                </p>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  {type.features.map((feature, featureIndex) => (
                    <motion.div
                      key={featureIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + featureIndex * 0.1 }}
                      className="flex items-center space-x-3"
                    >
                      <div className={`w-2 h-2 bg-gradient-to-r ${type.color} rounded-full`} />
                      <span className="text-slate-700 font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA Button */}
                <motion.div
                  whileHover={{ x: 5 }}
                  className={`inline-flex items-center space-x-2 text-transparent bg-gradient-to-r ${type.color} bg-clip-text font-bold text-lg group-hover:scale-105 transition-transform`}
                >
                  <span>Start {type.title}</span>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            {[
              { icon: User, label: 'Active Users', value: '10K+', color: 'text-blue-600' },
              { icon: Trophy, label: 'Success Rate', value: '95%', color: 'text-green-600' },
              { icon: Target, label: 'Avg. Score Improvement', value: '+40%', color: 'text-purple-600' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4 + index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
                className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100"
              >
                <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-slate-600 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
        </div>
      </>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {showInstructions ? (
        <InstructionsScreen key="instructions" />
      ) : (
        <SelectionScreen key="selection" />
      )}
    </AnimatePresence>
  );
}