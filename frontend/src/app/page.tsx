'use client';

import { motion } from 'framer-motion';
import { Code2, Trophy, Brain, Mic, Play, ArrowRight, Star } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isHovering, setIsHovering] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  const logoVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.05,
      rotate: [0, -2, 2, 0],
    },
  };

  const features = [
    {
      icon: Mic,
      title: "Voice-Powered",
      description: "Natural voice interactions with AI interviewer"
    },
    {
      icon: Brain,
      title: "AI-Driven",
      description: "Intelligent question generation and real-time feedback"
    },
    {
      icon: Trophy,
      title: "Skill Assessment",
      description: "Comprehensive evaluation of technical abilities"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-20"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-40 right-20 w-24 h-24 bg-indigo-100 rounded-full opacity-30"
        />
        <motion.div
          animate={{
            x: [0, 120, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-20 left-1/4 w-20 h-20 bg-purple-100 rounded-full opacity-25"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col min-h-screen"
      >
        {/* Navigation */}
        <motion.nav
          variants={itemVariants}
          className="flex justify-between items-center p-6 lg:p-8"
        >
          <motion.div
            variants={logoVariants}
            initial="initial"
            whileHover="hover"
            className="flex items-center space-x-2 cursor-pointer"
            onHoverStart={() => setIsHovering(true)}
            onHoverEnd={() => setIsHovering(false)}
          >
            <div className="relative">
              <Code2 className="w-8 h-8 text-indigo-600" />
              <motion.div
                animate={isHovering ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
              />
            </div>
            <motion.span
              animate={isHovering ? { color: "#4f46e5" } : { color: "#1f2937" }}
              className="text-2xl font-bold tracking-tight"
            >
              Code<span className="text-indigo-600">Win</span>
            </motion.span>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Sign In
          </motion.button>
        </motion.nav>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col justify-center items-center text-center px-6 lg:px-8">
          <motion.div
            variants={itemVariants}
            className="max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-8"
            >
              <Star className="w-4 h-4" />
              <span>AI-Powered Interview Platform</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Master Your
              <motion.span
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]"
              >
                Coding Interviews
              </motion.span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Practice with our AI interviewer, get real-time feedback, and boost your confidence for technical interviews.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <Link href="/interview">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 30px -10px rgba(79, 70, 229, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-indigo-700 transition-all overflow-hidden"
                >
                  <motion.div
                    initial={{ x: -100, opacity: 0 }}
                    whileHover={{ x: 0, opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600"
                  />
                  <span className="relative z-10 flex items-center space-x-2">
                    <Play className="w-5 h-5" />
                    <span>Start Interview</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              </Link>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                Watch Demo
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Features */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-20"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 10px 25px -10px rgba(0, 0, 0, 0.1)",
                  y: -5 
                }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 cursor-pointer"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-4"
                >
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </main>

        {/* Footer */}
        <motion.footer
          variants={itemVariants}
          className="text-center py-8 text-gray-500 text-sm"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            © 2025 CodeWin. Empowering developers worldwide.
          </motion.p>
        </motion.footer>
      </motion.div>
    </div>
  );
}
