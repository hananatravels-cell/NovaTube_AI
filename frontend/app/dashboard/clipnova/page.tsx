"use client";
import React from 'react';

export default function ClipNovaPage() {
  return (
    <div className="p-6 min-h-screen bg-[#0a0a0f]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          🎬 ClipNova
        </h1>
        <p className="text-gray-400 mb-8">
          Upload a long video and let AI automatically extract viral, captioned Shorts.
        </p>
        
        <div className="border-2 border-dashed border-gray-700 rounded-2xl p-16 text-center hover:border-violet-500 transition-all duration-300 bg-[#12121a]">
          <div className="text-6xl mb-6">📤</div>
          <h3 className="text-2xl font-semibold text-white mb-3">Upload Long Video</h3>
          <p className="text-gray-400 mb-8">Drag & drop your MP4/MOV file here, or click to browse</p>
          <button className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-violet-500/20">
            Select Video File
          </button>
          <p className="text-xs text-gray-500 mt-6">Max file size: 500MB | Supported: MP4, MOV, WEBM</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          <div className="bg-[#12121a] p-5 rounded-xl border border-gray-800">
            <h4 className="text-white font-semibold mb-2">🤖 AI Viral Detection</h4>
            <p className="text-sm text-gray-400">Finds the most engaging moments automatically.</p>
          </div>
          <div className="bg-[#12121a] p-5 rounded-xl border border-gray-800">
            <h4 className="text-white font-semibold mb-2">📝 Auto Captions</h4>
            <p className="text-sm text-gray-400">Adds dynamic, TikTok-style captions.</p>
          </div>
          <div className="bg-[#12121a] p-5 rounded-xl border border-gray-800">
            <h4 className="text-white font-semibold mb-2">📱 9:16 Format</h4>
            <p className="text-sm text-gray-400">Perfectly cropped for Shorts & Reels.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
