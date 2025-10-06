"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const greetings = [
  "Shri Ganeshay Namah",
  "Jai Jalaram Bappa",
  "Jai Surapura Bappa",
  "Jai Satyay Maa",
  "Jai Bhavani",
  "Jai Jinendra",
  "Jai Shree Krishna",
];

const variants = {
  enter: {
    opacity: 0,
    y: 10,
  },
  center: {
    zIndex: 1,
    opacity: 1,
    y: 0,
  },
  exit: {
    zIndex: 0,
    opacity: 0,
    y: -10,
  },
};

export default function WelcomePage() {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => {
        if (prevIndex === greetings.length - 1) {
          return 0; // Loop back to the start
        }
        return prevIndex + 1;
      });
    }, 1200); // Time each greeting is displayed

    // Total duration for the splash screen before redirecting
    const redirectTimeout = setTimeout(() => {
      clearInterval(interval); // Stop the animation
      router.push('/dashboard');
    }, greetings.length * 1200 + 500); // Wait for one full cycle + a little extra

    return () => {
      clearInterval(interval);
      clearTimeout(redirectTimeout);
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-background text-foreground overflow-hidden">
      <AnimatePresence>
        <motion.h1
          key={index}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            y: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 },
          }}
          className={cn(
            "absolute text-4xl md:text-6xl font-display font-semibold tracking-tight",
            // You can add font styles here if you have a specific display font
          )}
        >
          {greetings[index]}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}
