'use client';

import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, FileText, Trophy, Clock, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';

interface SessionData {
  interviewType: string;
  timestamp: string;
  messages: string[];
}

interface ResultsData {
  interview_id?: string;
  session_id?: string;
  interview_type: string;
  topics: string[];
  total_questions: number;
  completed_questions: number;
  average_score: number;
  individual_scores?: number[];
  duration: number;
  start_time: number | string;
  end_time: number | string;
  status: string;
  created_at?: string;
  final_results?: any;
  completion_method?: string;
}

export default function InterviewResultsPage() {
  const searchParams = useSearchParams();
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        console.log('Results page loaded'); // Debug log
        
        // First check if we have a session ID in localStorage
        const sessionData = localStorage.getItem('interviewSession');
        if (sessionData) {
          const { sessionId } = JSON.parse(sessionData);
          console.log('Found session ID:', sessionId);
          
          // Try to fetch from database API
          try {
            const response = await fetch(`http://localhost:8000/api/interview-results/${sessionId}`);
            if (response.ok) {
              const data = await response.json();
              console.log('Fetched results from database:', data);
              // Normalize fields if backend uses different keys
              const normalized = {
                session_id: data.session_id || data.sessionId || data.id,
                interview_type: data.interview_type || data.interviewType,
                topics: data.topics || [],
                total_questions: data.total_questions || data.totalQuestions || 0,
                completed_questions: data.completed_questions || data.completedQuestions || 0,
                average_score: data.average_score || data.averageScore || 0,
                individual_scores: data.individual_scores || data.individualScores || [],
                duration: data.duration || data.total_time || 0,
                start_time: data.start_time || data.startTime,
                end_time: data.end_time || data.endTime,
                status: data.status || 'completed',
                completion_method: data.completion_method || data.completionMethod || 'automatic',
                final_results: data.final_results || data.finalResults || {}
              };
              setResultsData(normalized as ResultsData);
              setIsLoading(false);
              return;
            }
          } catch (apiError) {
            console.warn('Failed to fetch from API, trying localStorage fallback:', apiError);
          }
        }
        
        // Fallback: Check for localStorage results
        const savedResults = localStorage.getItem('interviewResults');
        if (savedResults) {
          try {
            const results = JSON.parse(savedResults);
            console.log('Found interview results in localStorage:', results);
            
            // Transform to match new format if needed
            const transformedData: ResultsData = {
              session_id: results.session_id || 'legacy-session',
              interview_type: results.interview_type || 'technical',
              topics: results.topics || ['Technical Interview'],
              total_questions: results.total_questions || 1,
              completed_questions: results.completed_questions || 1,
              average_score: results.average_score || 85,
              duration: results.duration || results.total_time || 600,
              start_time: results.start_time || Date.now() / 1000 - 600,
              end_time: results.end_time || results.timestamp || Date.now() / 1000,
              status: 'completed',
              final_results: results.final_results || {}
            };
            
            setResultsData(transformedData);
            localStorage.removeItem('interviewResults');
            setIsLoading(false);
            return;
          } catch (parseError) {
            console.error('Error parsing saved results:', parseError);
          }
        }
        
        // Check for legacy session data
        const savedSession = localStorage.getItem('lastInterviewSession');
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            console.log('Found legacy session data:', session);
            
            const legacyData: ResultsData = {
              interview_type: session.interviewType || 'technical',
              topics: ['Technical Interview'],
              total_questions: 1,
              completed_questions: 1,
              average_score: 85,
              duration: 600,
              start_time: Date.now() / 1000 - 600,
              end_time: Date.now() / 1000,
              status: 'completed'
            };
            
            setResultsData(legacyData);
            localStorage.removeItem('lastInterviewSession');
            setIsLoading(false);
            return;
          } catch (sessionError) {
            console.error('Error parsing session data:', sessionError);
          }
        }

        // If no data found anywhere
        setError('No interview results found. Please complete an interview first.');
        setIsLoading(false);
        
      } catch (error) {
        console.error('Error in fetchResults:', error);
        setError('Failed to load interview results.');
        setIsLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-cyan-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-lg text-slate-600 font-medium">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-cyan-50 to-violet-50">
        <Navbar theme="light" />
        <div className="flex items-center justify-center min-h-screen pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-gray-100 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Interview Results Found</h2>
            <p className="text-red-600 mb-6 leading-relaxed">{error}</p>
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-violet-600 transition-all shadow-lg flex items-center justify-center"
              >
                Start New Interview
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!resultsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-cyan-50 to-violet-50">
        <Navbar theme="light" />
        <div className="flex items-center justify-center pt-20">
          <div className="text-center">
            <p className="text-lg text-slate-600 mb-4">No results found</p>
            <Link 
              href="/interview" 
              className="inline-flex items-center px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Start New Interview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Helper functions for data formatting
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTime = (timestamp: number | string) => {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString: string | number): string => {
    if (typeof dateString === 'number') {
      return new Date(dateString * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatInterviewType = (type: string): string => {
    return type === 'technical' ? 'Technical Interview' : 
           type === 'resume' ? 'Resume-based Interview' : 
           type.charAt(0).toUpperCase() + type.slice(1) + ' Interview';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cyan-50 to-violet-50">
      <Navbar theme="light" />
      
      {/* Main Content Container */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
              className="relative inline-block mb-8"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-full flex items-center justify-center shadow-xl">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-cyan-400 to-violet-400 rounded-full blur-xl opacity-30 -z-10"></div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 via-cyan-600 to-violet-600 bg-clip-text text-transparent mb-6"
            >
              Interview Completed!
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed"
            >
              🎉 Congratulations! You've successfully completed your interview. 
              Here's a comprehensive summary of your performance.
            </motion.p>
          </div>

          {/* Completion Status Indicator */}
          {resultsData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="flex justify-center mb-12"
            >
              <div className={`inline-flex items-center px-6 py-3 rounded-full text-sm font-medium shadow-lg ${
                resultsData.final_results?.completion_status === 'manually_ended' || resultsData.completion_method === 'manually_ended'
                  ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200'
                  : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
              }`}>
                {resultsData.final_results?.completion_status === 'manually_ended' || resultsData.completion_method === 'manually_ended' ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Interview Manually Ended
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Interview Completed
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Results Summary Cards */}
          {resultsData && (
            <div className="space-y-12">
              {/* Performance Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                {/* Score Card */}
                {typeof resultsData.average_score === 'number' && (
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl blur-lg opacity-15 group-hover:opacity-25 transition-opacity duration-300"></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-yellow-200/50 shadow-lg">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                          <Trophy className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-slate-800 mb-2">
                          {Math.round(resultsData.average_score)}/100
                        </div>
                        <div className="text-sm text-slate-600 font-medium">Final Score</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Questions Card */}
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl blur-lg opacity-15 group-hover:opacity-25 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                        <Target className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-200 mb-2">
                        {resultsData.completed_questions || 1}/{resultsData.total_questions || 1}
                      </div>
                      <div className="text-sm text-slate-400 font-medium">Questions Completed</div>
                    </div>
                  </div>
                </motion.div>

                {/* Time Card */}
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl blur-lg opacity-15 group-hover:opacity-25 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                        <Clock className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-200 mb-2">
                        {formatDuration(resultsData.duration)}
                      </div>
                      <div className="text-sm text-slate-400 font-medium">Total Duration</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Interview Details */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.8 }}
                className="relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl blur-lg opacity-20"></div>
                <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-xl">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-lg flex items-center justify-center mr-4 shadow-md">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-200">Interview Summary</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-sm font-medium">Interview Type</span>
                      <span className="text-slate-200 text-lg font-semibold">
                        {formatInterviewType(resultsData.interview_type)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-sm font-medium">Duration</span>
                      <span className="text-slate-200 text-lg font-semibold">
                        {formatDuration(resultsData.duration)}
                      </span>
                    </div>

                    {resultsData.start_time && (
                      <div className="space-y-1">
                        <span className="text-slate-400 block text-sm font-medium">Interview Started</span>
                        <span className="text-slate-200 text-base font-medium">
                          {formatDateTime(resultsData.start_time)}
                        </span>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-sm font-medium">Interview Ended</span>
                      <span className="text-slate-200 text-base font-medium">
                        {formatDateTime(resultsData.end_time)}
                      </span>
                    </div>

                    {resultsData.topics && resultsData.topics.length > 0 && (
                      <div className="md:col-span-2 space-y-3">
                        <span className="text-slate-400 block text-sm font-medium">Topics Covered</span>
                        <div className="flex flex-wrap gap-2">
                          {resultsData.topics.map((topic: string, index: number) => (
                            <motion.span
                              key={index}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 1.2 + index * 0.1 }}
                              className="px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-slate-200 rounded-full text-sm border border-cyan-500/30 font-medium shadow-sm"
                            >
                              {topic}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Motivational Message */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.8 }}
                className="relative overflow-hidden"
              >
                <div className="bg-gradient-to-r from-cyan-500 to-violet-500 rounded-2xl p-8 text-center shadow-lg">
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                    <h3 className="text-2xl font-bold text-slate-200 mb-4">What's Next?</h3>
                    <p className="text-base text-slate-300 mb-6 max-w-2xl mx-auto leading-relaxed">
                      🚀 Great job completing the interview! Use this experience to continue improving your skills. 
                      Remember, every interview is a learning opportunity that brings you closer to your goals.
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                    <div className="text-sm text-slate-400 font-medium">
                      Keep practicing, keep improving! 💪
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="text-center mt-12"
          >
            <Link
              href="/interview"
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-base"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              Take Another Interview
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}