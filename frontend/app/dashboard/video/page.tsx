'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Video, Play, Download, Wand2, Film, Monitor, Smartphone, Square as SquareIcon, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VideoGeneratorPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const [formData, setFormData] = useState({
    prompt: '',
    style: 'cinematic',
    ratio: '16:9',
    duration: '10',
    quality: 'hd',
  });

  const styles = [
    { id: 'cinematic', name: 'Cinematic', emoji: '', desc: 'Realistic & Professional' },
    { id: 'cartoon', name: 'Cartoon', emoji: '🎨', desc: 'Pixar/Disney Style' },
    { id: 'anime', name: 'Anime', emoji: '', desc: 'Japanese Animation' },
    { id: '3d', name: '3D Animation', emoji: '🎭', desc: '3D Rendered' },
    { id: 'documentary', name: 'Documentary', emoji: '📹', desc: 'Real World Footage' },
    { id: 'abstract', name: 'Abstract', emoji: '🎨', desc: 'Artistic & Creative' },
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prompt.trim()) return toast.error('Please enter a prompt first!');

    setIsGenerating(true);
    setGeneratedVideo('');
    setProgressMessage('Generating voiceover…');

    try {
      const orientation = formData.ratio === '9:16' ? 'vertical' : 'horizontal';

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: formData.prompt,
          voice: 'Aria — Warm & Clear',
          language: 'English',
          category: 'storytelling',
          orientation,
        }),
      });

      setProgressMessage('Fetching clips and assembling video…');

      const data = await res.json();

      if (!res.ok || !data.video) {
        throw new Error(data.error || 'Generation failed');
      }

      setGeneratedVideo(data.video);
      toast.success('AI Video generated successfully! 🎬');
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsGenerating(false);
      setProgressMessage('');
    }
  };

  const downloadVideo = () => {
    if (!generatedVideo) return;
    const link = document.createElement('a');
    link.href = generatedVideo;
    link.download = `novatube-ai-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started! 📥');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6 sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center space-x-2 text-gray-400 hover:text-white transition mr-6">
          <ArrowLeft className="w-5 h-5" /> <span className="font-medium">Back to Dashboard</span>
        </Link>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold">AI Video Generator</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 h-fit">
          <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2">
            <Wand2 className="w-5 h-5 text-blue-400" /> <span>Video Settings</span>
          </h2>
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Video Prompt / Description *</label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
                placeholder="e.g., A futuristic city with flying cars..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center space-x-1">
                <Film className="w-4 h-4" /> <span>Video Style</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, style: style.id })}
                    className={`p-3 rounded-lg border transition text-left ${
                      formData.style === style.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{style.emoji}</div>
                    <div className="font-medium text-sm">{style.name}</div>
                    <div className="text-xs opacity-75">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ratio: '16:9' })}
                  className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-lg border transition ${
                    formData.ratio === '16:9' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'
                  }`}
                >
                  <Monitor className="w-5 h-5" /> <span className="text-xs font-medium">16:9</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ratio: '9:16' })}
                  className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-lg border transition ${
                    formData.ratio === '9:16' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'
                  }`}
                >
                  <Smartphone className="w-5 h-5" /> <span className="text-xs font-medium">9:16</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ratio: '1:1' })}
                  className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-lg border transition ${
                    formData.ratio === '1:1' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'
                  }`}
                >
                  <SquareIcon className="w-5 h-5" /> <span className="text-xs font-medium">1:1</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                >
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                  <option value="15">15 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">60 seconds</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quality</label>
                <select
                  value={formData.quality}
                  onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                >
                  <option value="sd">SD (480p)</option>
                  <option value="hd">HD (720p)</option>
                  <option value="fhd">Full HD (1080p)</option>
                  <option value="4k">4K (2160p)</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2 mt-4"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Rendering Video (AI)...</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  <span>Generate Video</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <Play className="w-5 h-5 text-blue-400" /> <span>Video Preview</span>
            </h2>
            {generatedVideo && (
              <button
                onClick={downloadVideo}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-400 hover:text-white transition flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs">Download</span>
              </button>
            )}
          </div>
          <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 space-y-6 overflow-hidden">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-blue-400 animate-pulse text-center">{progressMessage}</p>
                <p className="text-xs text-gray-500">This can take a minute or two…</p>
              </div>
            ) : generatedVideo ? (
              <div className="w-full h-full flex flex-col">
                <div
                  className="relative flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden"
                  style={{ minHeight: '350px', height: '400px' }}
                >
                  <video ref={videoRef} src={generatedVideo} controls className="w-full h-full object-contain" playsInline>
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-200 font-medium">AI Generation Complete!</p>
                    <p className="text-xs text-green-100/70">Video rendered successfully. Use controls to Play, Pause, or Fullscreen.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Video className="w-10 h-10 text-blue-400 opacity-50" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-300">No video generated yet</p>
                  <p className="text-sm mt-2">Enter your prompt and click "Generate Video"</p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}