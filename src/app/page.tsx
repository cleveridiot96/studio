
"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import AppLayout from './(app)/layout'; // Import the main layout

const GREETINGS = [
  "Shri Ganeshay Namah",
  "Jai Jalaram Bappa",
  "Jai Surapura Bappa",
  "Jai Satyay Maa",
  "Jai Bhavani",
  "Jai Jinendra",
  "Jai Shree Krishna",
];

// This page now acts as a smart loader and entry point.
export default function SmartLoaderPage() {
  const [index, setIndex] = useState(0);
  const [showApp, setShowApp] = useState(false);
  const [isAnimationActive, setIsAnimationActive] = useState(true);

  useEffect(() => {
    const totalAnimationTime = GREETINGS.length * 2000 + 500; // Duration for all greetings + final fade

    const animationTimer = setTimeout(() => {
      setIsAnimationActive(false); // Mark animation as finished
    }, totalAnimationTime);

    // This effect runs only once to manage the animation sequence.
    if (index < GREETINGS.length -1) {
      const greetingTimer = setTimeout(() => {
        setIndex(prevIndex => prevIndex + 1);
      }, 2000); // Each greeting stays for 2 seconds
      return () => {
        clearTimeout(greetingTimer);
        clearTimeout(animationTimer);
      };
    }
  }, [index]);

  useEffect(() => {
    // When the animation is no longer active, reveal the app.
    if (!isAnimationActive) {
      setShowApp(true);
    }
  }, [isAnimationActive]);
  
  // Conditionally render AppLayout but keep it in the DOM to preload.
  // We use opacity and z-index to hide it initially.
  return (
    <div className="h-screen w-screen bg-background">
      <div
        className={cn(
          "absolute inset-0 z-10 transition-opacity duration-500",
          showApp ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="absolute text-4xl md:text-6xl font-semibold text-center"
            >
              {GREETINGS[index]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      {/* 
        The AppLayout is rendered immediately but hidden.
        This triggers Next.js to preload all its child components and data hooks
        while the welcome animation is playing.
      */}
      <div 
        className={cn(
            "h-full w-full transition-opacity duration-500",
            showApp ? "opacity-100" : "opacity-0"
        )}
      >
        <AppLayout>
            {/* You can place a default child here, or let the layout handle its default state */}
        </AppLayout>
      </div>
    </div>
  );
}
