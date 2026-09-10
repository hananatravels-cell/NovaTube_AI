'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, FileText, Mic, Video, Image as ImageIcon, TrendingUp, Settings,
  Bell, Search, LogOut, Play, Pause, Download, RotateCcw,
} from 'lucide-react';

export default function VoicePage() {
  const [activeTab] = useState('voice');
  const [script, setScript] = useState('');
  const [voice, setVoice] = useState('Aria — Warm & Clear');
  const [language, setLanguage] = useState('English');
  const [style, setStyle] = useState('Narration');
  const [speed, setSpeed] = useState('1.0x');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sidebarItems = [
    { name: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, id: 'overview', href: '/dashboard' },
    { name: 'AI Scripts', icon: <FileText className="w-5 h-5" />, id: 'scripts', href: '/dashboard/scripts' },
    { name: 'Voice Generator', icon: <Mic className="w-5 h-5" />, id: 'voice', href: '/dashboard/voice' },
    { name: 'Video Generator', icon: <Video className="w-5 h-5" />, id: 'videos', href: '/dashboard/video' },
    { name: 'Thumbnails', icon: <ImageIcon className="w-5 h-5" />, id: 'thumbnails', href: '/dashboard/thumbnails' },
    { name: 'Analytics', icon: <TrendingUp className="w-5 h-5" />, id: 'analytics', href: '/dashboard' },
    { name: 'Settings', icon: <Settings className="w-5 h-5" />, id: 'settings', href: '/dashboard' },
  ];

  async function handleGenerate() {
    if (!script.trim()) return;
    setIsGenerating(true);
    setIsReady(false);
    setErrorMsg(null);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const res = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: script, voice, language }),
      });

      const data = await res.json();

      if (!res.ok || !data.audio) {
        setErrorMsg(data.error || 'Voice generation failed.');
        setIsGenerating(false);
        return;
      }

      setAudioUrl(data.audio);
      setIsReady(true);
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not connect to the voice service.');
    } finally {
      setIsGenerating(false);
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function handleDownload() {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `novatube-voice-${Date.now()}.mp3`;
    link.click();
  }

  const fieldBase = 'w-full rounded-xl px-5 py-4 text-base font-medium transition appearance-none focus:outline-none border';
  const scriptCls = `${fieldBase} bg-white/[0.04] text-white border-white/[0.08] placeholder-white/30 focus:ring-2 focus:ring-white/20 focus:border-white/25 resize-none`;
  const voiceCls = `${fieldBase} bg-white/[0.04] text-emerald-300 border-emerald-400/25 focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400/40`;
  const langCls = `${fieldBase} bg-white/[0.04] text-sky-300 border-sky-400/25 focus:ring-2 focus:ring-sky-400/25 focus:border-sky-400/40`;
  const styleCls = `${fieldBase} bg-white/[0.04] text-orange-300 border-orange-400/25 focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400/40`;
  const speedCls = `${fieldBase} bg-white/[0.04] text-fuchsia-300 border-fuchsia-400/25 focus:ring-2 focus:ring-fuchsia-400/25 focus:border-fuchsia-400/40`;

  return (
    <div className="min-h-screen bg-[#08080C] text-[#EDEDF2] flex font-sans">
      <aside className="w-72 bg-[#0B0B10] border-r border-white/[0.06] hidden md:flex flex-col">
        <div className="p-6 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-violet-300" fill="currentColor" />
            </div>
            <span className="text-lg font-bold tracking-tight">NovaTube AI</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative w-full flex items-center gap-3.5 pl-5 pr-4 py-3.5 rounded-xl transition-all duration-150 border ${
                  isActive
                    ? 'bg-violet-500/[0.08] border-violet-400/20 text-white'
                    : 'border-transparent text-white/45 hover:text-white/85 hover:bg-white/[0.03]'
                }`}
              >
                <span className={isActive ? 'text-violet-300' : 'text-white/40'}>{item.icon}</span>
                <span className="text-[15px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/[0.06]">
          <Link href="/login" className="w-full flex items-center gap-3.5 pl-5 pr-4 py-3.5 text-white/35 hover:text-rose-300 hover:bg-rose-500/[0.06] rounded-xl transition text-[15px] font-medium border border-transparent hover:border-rose-400/15">
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-[#08080C]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-10 sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Voice Generator</h1>
            <p className="text-sm text-white/35">Turn your script into a natural AI voiceover.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="text" placeholder="Search videos, scripts…" className="w-72 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400/30 transition" />
            </div>
            <button className="relative p-2.5 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-xl transition border border-transparent hover:border-white/[0.08]">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-400 rounded-full" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/[0.08]">
              <div className="w-9 h-9 bg-white/[0.06] border border-white/[0.1] rounded-full flex items-center justify-center text-sm font-bold text-white/80">JD</div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-10 overflow-y-auto">
          <div className="grid lg:grid-cols-[520px_1fr] gap-8 items-stretch h-full min-h-[calc(100vh-160px)]">
            <div className="bg-[#0F0F15] border border-white/[0.07] rounded-2xl p-10 flex flex-col">
              <div className="flex items-center gap-3 mb-9">
                <Mic className="w-6 h-6 text-violet-300" />
                <h3 className="text-lg font-semibold">Generate Voiceover</h3>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2.5">Script</label>
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Paste your script here, or write a few lines to preview a voice…"
                    rows={9}
                    className={scriptCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-emerald-300/80 mb-2.5">Voice</label>
                  <select value={voice} onChange={(e) => setVoice(e.target.value)} className={voiceCls}>
                    {['Aria — Warm & Clear', 'Noah — Deep & Confident', 'Maya — Bright & Energetic', 'Zayn — Calm & Reflective'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-sky-300/80 mb-2.5">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className={langCls}>
                    {['English', 'Urdu', 'Roman Urdu', 'Arabic'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-orange-300/80 mb-2.5">Style</label>
                  <select value={style} onChange={(e) => setStyle(e.target.value)} className={styleCls}>
                    {['Narration', 'Conversational', 'News Anchor', 'Storytelling'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-fuchsia-300/80 mb-2.5">Speed</label>
                  <select value={speed} onChange={(e) => setSpeed(e.target.value)} className={speedCls}>
                    {['0.75x', '1.0x', '1.25x', '1.5x'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-4 text-sm text-rose-300 bg-rose-500/[0.08] border border-rose-400/20 rounded-xl px-4 py-3">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!script.trim() || isGenerating}
                className="w-full flex items-center justify-center gap-2.5 bg-violet-500/[0.12] border border-violet-400/25 text-violet-200 text-base font-semibold py-4 rounded-xl hover:bg-violet-500/[0.18] transition disabled:opacity-40 disabled:cursor-not-allowed mt-7"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-violet-300/30 border-t-violet-200 rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" /> Generate Voice
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#0F0F15] border border-white/[0.07] rounded-2xl p-10 flex flex-col">
              {!isReady && !isGenerating && (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-6">
                    <Mic className="w-9 h-9 text-white/25" />
                  </div>
                  <p className="text-lg font-medium text-white/60 mb-2">Your AI voiceover will appear here</p>
                  <p className="text-base text-white/30">Add a script and click "Generate Voice"</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-400" />
                    </span>
                    <span className="text-sm font-semibold uppercase tracking-wide text-violet-300">AI Working</span>
                  </div>
                  <p className="text-lg text-white/60">AI is generating your voiceover…</p>
                </div>
              )}

              {isReady && !isGenerating && audioUrl && (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-9">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-300 bg-emerald-500/[0.08] border border-emerald-400/20 rounded-full px-5 py-2">
                      ✓ Voice Ready
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={handleGenerate} className="p-3 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-xl transition border border-transparent hover:border-white/[0.08]" title="Regenerate"><RotateCcw className="w-5 h-5" /></button>
                      <button onClick={handleDownload} className="flex items-center gap-2 text-sm font-semibold bg-violet-500/[0.12] border border-violet-400/25 text-violet-200 px-5 py-3 rounded-xl hover:bg-violet-500/[0.18] transition"><Download className="w-4 h-4" /> Download</button>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-5 mb-9">
                      <button
                        onClick={togglePlay}
                        className="w-[72px] h-[72px] rounded-full bg-violet-500/[0.14] border border-violet-400/25 flex items-center justify-center flex-shrink-0 hover:bg-violet-500/[0.2] transition"
                      >
                        {isPlaying ? <Pause className="w-7 h-7 text-violet-200" fill="currentColor" /> : <Play className="w-7 h-7 text-violet-200 ml-0.5" fill="currentColor" />}
                      </button>
                      <div className="flex-1">
                        <p className="text-lg font-medium mb-1.5">{voice}</p>
                        <p className="text-base text-white/35">{style} · {language} · {speed}</p>
                      </div>
                    </div>

                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full"
                      controls
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}