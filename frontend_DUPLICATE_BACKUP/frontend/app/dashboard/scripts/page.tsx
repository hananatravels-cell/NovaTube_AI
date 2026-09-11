'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, FileText, Mic, Video, Image as ImageIcon, TrendingUp, Settings,
  Bell, Search, LogOut, Play, Sparkles, Copy, RotateCcw, Save, Pencil, Wand2,
} from 'lucide-react';

export default function ScriptsPage() {
  const [activeTab] = useState('scripts');
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('Educational');
  const [length, setLength] = useState('5-7 min');
  const [tone, setTone] = useState('Conversational');
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<null | {
    title: string; hook: string; script: string; scenes: string[]; voiceover: string; cta: string;
  }>(null);

  const sidebarItems = [
    { name: 'Overview', icon: <LayoutDashboard className="w-[18px] h-[18px]" />, id: 'overview', href: '/dashboard' },
    { name: 'AI Scripts', icon: <FileText className="w-[18px] h-[18px]" />, id: 'scripts', href: '/dashboard/scripts' },
    { name: 'Voice Generator', icon: <Mic className="w-[18px] h-[18px]" />, id: 'voice', href: '/dashboard/voice' },
    { name: 'Video Generator', icon: <Video className="w-[18px] h-[18px]" />, id: 'videos', href: '/dashboard/video' },
    { name: 'Thumbnails', icon: <ImageIcon className="w-[18px] h-[18px]" />, id: 'thumbnails', href: '/dashboard/thumbnails' },
    { name: 'Analytics', icon: <TrendingUp className="w-[18px] h-[18px]" />, id: 'analytics', href: '/dashboard' },
    { name: 'Settings', icon: <Settings className="w-[18px] h-[18px]" />, id: 'settings', href: '/dashboard' },
  ];

  function handleGenerate() {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setResult(null);
    setTimeout(() => {
      setResult({
        title: `${topic} — What You Actually Need to Know`,
        hook: `Most people get ${topic.toLowerCase()} completely wrong. Here's what's really going on.`,
        script: `[Full script body would appear here, generated for: "${topic}"]`,
        scenes: ['Scene 1 — Open on the hook, direct to camera', 'Scene 2 — B-roll supporting the first point', 'Scene 3 — Second key point with on-screen text', 'Scene 4 — Wrap-up and call to action'],
        voiceover: `Calm, confident narration. Pace: ${length}. Tone: ${tone}.`,
        cta: 'Subscribe for more videos like this, and drop a comment with your take.',
      });
      setIsGenerating(false);
    }, 1800);
  }

  const selectCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-5 text-base font-medium focus:outline-none focus:ring-1 focus:ring-violet-400/50 focus:border-violet-400/50 transition appearance-none min-h-[56px]';

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#EDEDF2] flex font-sans">
      <aside className="w-64 bg-[#0D0D13] border-r border-white/[0.06] hidden md:flex flex-col">
        <div className="p-6 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Play className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">NovaTube AI</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive ? 'bg-white/[0.06] text-white' : 'text-white/45 hover:text-white/85 hover:bg-white/[0.03]'
                }`}
              >
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-gradient-to-b from-violet-400 to-cyan-400 transition-all duration-150 ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}`} />
                <span className={isActive ? 'text-violet-300' : ''}>{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <Link href="/login" className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-white/35 hover:text-rose-400 hover:bg-rose-500/[0.06] rounded-lg transition text-sm font-medium">
            <LogOut className="w-[18px] h-[18px]" />
            <span>Log out</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight">AI Scripts</h1>
            <p className="text-[13px] text-white/35">Turn a topic into a complete, ready-to-record script.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="text" placeholder="Search videos, scripts…" className="w-64 bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-[13px] placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-violet-400/50 focus:border-violet-400/50 transition" />
            </div>
            <button className="relative p-2 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-400 rounded-full" />
            </button>
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.08]">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-full flex items-center justify-center text-xs font-bold">JD</div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
            <div className="bg-[#111117] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Wand2 className="w-4 h-4 text-violet-300" />
                <h3 className="text-sm font-semibold">Create New Script</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-white/45 mb-1.5">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Why the ocean looks blue"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-violet-400/50 focus:border-violet-400/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/45 mb-1.5">Content Type</label>
                  <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectCls}>
                    {['Educational', 'Entertainment', 'Tutorial', 'News & Commentary', 'Storytelling'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/45 mb-1.5">Video Length</label>
                  <select value={length} onChange={(e) => setLength(e.target.value)} className={selectCls}>
                    {['Under 1 min', '1-3 min', '3-5 min', '5-7 min', '10+ min'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/45 mb-1.5">Tone</label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className={selectCls}>
                    {['Conversational', 'Professional', 'Energetic', 'Calm & Reflective', 'Humorous'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/45 mb-1.5">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectCls}>
                    {['English', 'Urdu', 'Roman Urdu', 'Arabic'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || isGenerating}
                  className="w-full flex items-center justify-center gap-2 bg-white text-[#0A0A0F] text-sm font-semibold py-3 rounded-lg hover:bg-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                  {isGenerating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#0A0A0F]/30 border-t-[#0A0A0F] rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Generate Script
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-[#111117] border border-white/[0.07] rounded-xl p-6 min-h-[480px]">
              {!result && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-full text-center py-24">
                  <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-white/25" />
                  </div>
                  <p className="text-sm font-medium text-white/60 mb-1">Your AI-generated script will appear here</p>
                  <p className="text-[12px] text-white/30">Fill out the form and click "Generate Script"</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-full text-center py-24">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-violet-300">AI Working</span>
                  </div>
                  <p className="text-sm text-white/60">Writing your script…</p>
                </div>
              )}

              {result && !isGenerating && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-3 py-1">
                      ✓ Ready
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button className="p-2 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition" title="Copy"><Copy className="w-4 h-4" /></button>
                      <button className="p-2 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={handleGenerate} className="p-2 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition" title="Regenerate"><RotateCcw className="w-4 h-4" /></button>
                      <button className="flex items-center gap-1.5 text-xs font-semibold bg-white text-[#0A0A0F] px-3 py-2 rounded-lg hover:bg-white/90 transition"><Save className="w-3.5 h-3.5" /> Save</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35 mb-1.5">Title</p>
                    <p className="text-lg font-semibold">{result.title}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35 mb-1.5">Hook</p>
                    <p className="text-sm text-white/75 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">{result.hook}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35 mb-1.5">Script</p>
                    <p className="text-sm text-white/70 leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 whitespace-pre-wrap">{result.script}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35 mb-1.5">Scenes</p>
                    <div className="space-y-1.5">
                      {result.scenes.map((s, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-white/70 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                          <span className="text-violet-300 font-mono text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35 mb-1.5">Voiceover Notes</p>
                      <p className="text-sm text-white/70 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">{result.voiceover}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35 mb-1.5">Call to Action</p>
                      <p className="text-sm text-white/70 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">{result.cta}</p>
                    </div>
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