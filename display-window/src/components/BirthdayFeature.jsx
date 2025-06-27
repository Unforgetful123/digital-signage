import React from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

/**
 * BirthdayFeature component
 * Props:
 *  - name: string
 *  - designation: string
 *  - photoUrl: string
 *  - videoUrl?: string (optional background video)
 */
export default function BirthdayFeature({ name, designation, photoUrl, videoUrl }) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Background: video or gradient */}
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
      )}

      {/* Confetti Animation */}
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={300}
        gravity={0.2}
      />

      {/* Balloons */}
      <motion.div
        className="absolute bottom-0 left-10 w-16 h-32 bg-red-400 rounded-full"
        animate={{ y: [-20, 0, -20] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-16 w-16 h-32 bg-yellow-400 rounded-full"
        animate={{ y: [-15, 0, -15] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Staff Information Card */}
      <motion.div
        className="relative z-10 mx-auto my-16 p-6 bg-white bg-opacity-90 rounded-2xl shadow-xl w-4/5 max-w-lg flex items-center space-x-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <img
          src={photoUrl}
          alt={`${name}`}
          className="w-24 h-24 rounded-full object-cover border-4 border-white"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Happy Birthday, {name}!</h1>
          <p className="mt-1 text-lg text-gray-600">{designation}</p>
        </div>
      </motion.div>
    </div>
  );
}