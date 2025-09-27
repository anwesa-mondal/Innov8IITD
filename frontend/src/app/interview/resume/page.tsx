'use client';

import { motion } from 'framer-motion';
import { FileText, Upload, ArrowLeft, CheckCircle, Loader2, Play } from 'lucide-react';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ResumeInterviewPage() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackToSelection = () => {
    router.push('/interview');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        setUploadComplete(true);
      }, 2000);
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleStartInterview = () => {
    console.log('Starting resume-based interview...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="p-6">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -5 }}
          onClick={handleBackToSelection}
          className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Selection</span>
        </motion.button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-8">
            <FileText className="w-8 h-8 text-green-600 mr-3" />
            <span className="text-2xl font-bold">
              Code<span className="text-green-600">Sage</span>
            </span>
          </div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6"
          >
            Resume-based
            <span className="block text-green-600">Interview</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Upload your resume to get personalized questions based on your experience and projects
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center justify-center mb-8">
            <FileText className="w-6 h-6 text-green-600 mr-2" />
            <span className="text-green-600 font-medium">
              {resumeFile ? resumeFile.name : 'Choose Your Resume'}
            </span>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <div
              onClick={handleChooseFile}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition-all group"
            >
              <div className="flex flex-col items-center space-y-4">
                {isUploading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-16 h-16 text-green-600" />
                  </motion.div>
                ) : uploadComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <CheckCircle className="w-16 h-16 text-green-600" />
                  </motion.div>
                ) : (
                  <Upload className="w-16 h-16 text-gray-400 group-hover:text-green-600 transition-colors" />
                )}

                <div>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    {isUploading ? 'Uploading...' : uploadComplete ? 'File Uploaded!' : 'Choose File'}
                  </button>
                  <p className="text-gray-500 text-sm mt-2">
                    {resumeFile ? resumeFile.name : 'no file selected'}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-gray-600 font-medium">Upload your PDF resume (Max 10MB)</p>
                  <p className="text-gray-500 text-sm">Supported formats: PDF only</p>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </motion.div>

          {uploadComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-8"
            >
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 40px -10px rgba(34, 197, 94, 0.4)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartInterview}
                className="group relative px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg shadow-lg transition-all overflow-hidden"
              >
                <motion.div
                  initial={{ x: -100, opacity: 0 }}
                  whileHover={{ x: 0, opacity: 1 }}
                  className="absolute inset-0 bg-green-500"
                />
                <span className="relative z-10 flex items-center space-x-3">
                  <Play className="w-6 h-6" />
                  <span>Start Resume Interview</span>
                </span>
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        {!uploadComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="max-w-2xl mx-auto mt-12"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h4 className="font-semibold text-amber-800 mb-3">💡 Tips for best results:</h4>
              <ul className="text-sm text-amber-700 space-y-2">
                <li>• Ensure your resume is in PDF format and under 10MB</li>
                <li>• Include detailed project descriptions and technical skills</li>
                <li>• Make sure your contact information is up to date</li>
                <li>• List relevant work experience and achievements</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
