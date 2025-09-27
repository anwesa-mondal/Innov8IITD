'use client';

import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, Download, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SessionData {
  interviewType: string;
  timestamp: string;
  messages: string[];
}

interface ResultsData {
  interview_id: string;
  download_url: string;
  timestamp: string;
  interview_type: string;
}

export default function InterviewResultsPage() {
  const searchParams = useSearchParams();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Check for URL parameters first
    const interviewId = searchParams.get('id');
    const downloadUrl = searchParams.get('download_url');
    
    if (interviewId && downloadUrl) {
      setResultsData({
        interview_id: interviewId,
        download_url: decodeURIComponent(downloadUrl),
        timestamp: new Date().toISOString(),
        interview_type: 'Technical Interview'
      });
      return;
    }

    // Check for new interview results (from backend)
    const savedResults = localStorage.getItem('interviewResults');
    if (savedResults) {
      try {
        const results = JSON.parse(savedResults);
        setResultsData(results);
        // Clear the results data after reading
        localStorage.removeItem('interviewResults');
      } catch (e) {
        console.error('Failed to parse interview results:', e);
      }
    }

    // Fallback to old session data
    const savedSession = localStorage.getItem('lastInterviewSession');
    if (savedSession) {
      try {
        setSessionData(JSON.parse(savedSession));
      } catch (e) {
        console.error('Failed to parse session data:', e);
      }
    }
  }, [searchParams]);

  const downloadResults = async () => {
    if (!resultsData?.download_url) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(resultsData.download_url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview_results_${resultsData.interview_id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download results. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-10 h-10 text-green-600" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-gray-800 mb-2"
          >
            Interview Completed!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600"
          >
            Thank you for taking the time to complete the interview process.
          </motion.p>
        </div>

        {/* Session Summary */}
        {(resultsData || sessionData) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Interview Summary
              </h2>
              
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Interview Type:</span>
                  <span className="ml-2 capitalize text-gray-600">
                    {resultsData?.interview_type || sessionData?.interviewType}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Completed At:</span>
                  <span className="ml-2 text-gray-600">
                    {formatDate(resultsData?.timestamp || sessionData?.timestamp || '')}
                  </span>
                </div>
                
                {sessionData && (
                  <div>
                    <span className="font-medium text-gray-700">Total Interactions:</span>
                    <span className="ml-2 text-gray-600">{sessionData.messages.length} messages</span>
                  </div>
                )}

                {resultsData && (
                  <div>
                    <span className="font-medium text-gray-700">Interview ID:</span>
                    <span className="ml-2 font-mono text-sm text-gray-600">{resultsData.interview_id}</span>
                  </div>
                )}
              </div>

              {/* Download Button */}
              {resultsData && (
                <div className="mt-6 pt-6 border-t">
                  <button
                    onClick={downloadResults}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? 'Downloading...' : 'Download Results (JSON)'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Download your complete interview results including all questions, answers, and evaluations.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">What's Next?</h3>
            <p className="text-gray-600 mb-6">
              Your interview responses have been recorded. Our team will review your session and get back to you soon.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/interview">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Interview Hub
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 text-sm">
            Thank you for using CodeWin AI Interview Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
}