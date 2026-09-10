'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, FileText, Mic, Video, Image as ImageIcon, TrendingUp, Settings,
  Bell, Search, LogOut, Play, Sparkles, Calendar, CheckCircle, ArrowRight,
  Lightbulb, ChevronRight, Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'TOTAL VIDEOS', value: '24', icon: <Video className="w-4 h-4" />, trend: '+12%', trendUp: true },
    { label: 'AI CREDITS', value: '850', icon: <Sparkles className="w-4 h-4" />, trend: 'REMAINING', trendUp: null },
    { label: 'SCHEDULED', value: '03', icon: <Calendar className="w-4 h-4" />, trend: 'UPCOMING', trendUp: null },
    { label: 'PUBLISHED', value: '21', icon: <CheckCircle className="w-4 h-4" />, trend: '+5 THIS WK', trendUp: true },
  ];

  const sidebarItems = [
    { name: 'Overview', icon: <LayoutDashboard className="w-[18px] h-[18px]" />, id: 'overview' },
    { name: 'AI Scripts', icon: <FileText className="w-[18px] h-[18px]" />, id: 'scripts', href: '/dashboard/scripts' },
    { name: 'Voice Generator', icon: <Mic className="w-[18px] h-[18px]" />, id: 'voice', href: '/dashboard/voice' },
    { name: 'Video Generator', icon: <Video className="w-[18px] h-[18px]" />, id: 'videos', href: '/dashboard/video' },
    { name: 'Thumbnails', icon: <ImageIcon className="w-[18px] h-[18px]" />, id: 'thumbnails', href: '/dashboard/thumbnails' },
    { name: 'Analytics', icon: <TrendingUp className="w-[18px] h-[18px]" />, id: 'analytics' },
    { name: 'Settings', icon: <Settings className="w-[18px] h-[18px]" />, id: 'settings' },
  ];

  const quickActions = [
    { label: 'AI Script', desc: 'Generate a complete video script', icon: <FileText className="w-5 h-5" />, href: '/dashboard/scripts' },
    { label: 'Video', desc: 'Turn script into video', icon: <Video className="w-5 h-5" />, href: '/dashboard/video' },
    { label: 'Thumbnail', desc: 'Create a high-quality thumbnail', icon: <ImageIcon className="w-5 h-5" />, href: '/dashboard/thumbnails' },
    { label: 'SEO', desc: 'Optimize title, tags and description', icon: <TrendingUp className="w-5 h-5" /> },
  ];

  const workflow = [
    { icon: '💡', label: 'Idea', desc: 'AI finds the topic' },
    { icon: '📝', label: 'Script', desc: 'AI writes the script' },
    { icon: '🎙', label: 'Voice', desc: 'AI creates narration' },
    { icon: '🎬', label: 'Video', desc: 'AI creates the video' },
    { icon: '🖼', label: 'Thumbnail', desc: 'AI creates thumbnail' },
    { icon: '🔎', label: 'SEO', desc: 'AI optimizes content' },
    { icon: '🚀', label: 'Publish', desc: 'Ready to publish' },
  ];

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
            const cls = `relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg transition-all duration-150 ${
              isActive ? 'bg-white/[0.06] text-white' : 'text-white/45 hover:text-white/85 hover:bg-white/[0.03]'
            }`;
            const inner = (
              <>
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-gradient-to-b from-violet-400 to-cyan-400 transition-all duration-150 ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}`} />
                <span className={isActive ? 'text-violet-300' : ''}>{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </>
            );
            return item.href ? (
              <Link key={item.id} href={item.href} className={cls}>{inner}</Link>
            ) : (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={cls}>{inner}</button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06] space-y-2">
          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-400/10 border border-white/[0.08] p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">Pro Plan</span>
              <Zap className="w-3.5 h-3.5 text-violet-300" />
            </div>
            <p className="text-[11px] text-white/40 mb-2.5">850 credits remaining</p>
            <button className="w-full text-xs font-semibold bg-white text-[#0A0A0F] rounded-lg py-1.5 hover:bg-white/90 transition">
              Upgrade
            </button>
          </div>
          <Link href="/login" className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-white/35 hover:text-rose-400 hover:bg-rose-500/[0.06] rounded-lg transition text-sm font-medium">
            <LogOut className="w-[18px] h-[18px]" />
            <span>Log out</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight">Overview</h1>
            <p className="text-[13px] text-white/35">Here's what's happening with your content today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search videos, scripts…"
                className="w-64 bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-[13px] placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-violet-400/50 focus:border-violet-400/50 transition"
              />
            </div>
            <button className="relative p-2 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-400 rounded-full" />
            </button>
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.08]">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-full flex items-center justify-center text-xs font-bold">JD</div>
              <div className="hidden sm:block leading-tight">
                <p className="text-[13px] font-medium">John Doe</p>
                <p className="text-[11px] text-white/35">Pro Plan</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto space-y-8">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#15121F] via-[#12121A] to-[#0E1420] p-8">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-300 bg-violet-500/10 border border-violet-400/20 rounded-full px-3 py-1 mb-4">
                <Sparkles className="w-3 h-3" /> AI Content Workspace
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Create your next video with AI</h2>
              <p className="text-white/40 text-sm mb-6 max-w-lg">
                Go from a raw idea to a published video — script, voice, visuals, and SEO, all handled by NovaTube AI.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/scripts" className="inline-flex items-center gap-2 bg-white text-[#0A0A0F] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 transition">
                  Generate Script <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/dashboard/video" className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/[0.1] transition">
                  Create Video
                </Link>
                <Link href="/dashboard/voice" className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/[0.1] transition">
                  Generate Voice
                </Link>
                <Link href="/dashboard/thumbnails" className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/[0.1] transition">
                  Make Thumbnail
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-[#111117] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.14] transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-violet-300">{stat.icon}</div>
                  {stat.trendUp !== null && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${stat.trendUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/40 bg-white/5'}`}>
                      {stat.trend}
                    </span>
                  )}
                  {stat.trendUp === null && (
                    <span className="text-[11px] font-medium text-white/35">{stat.trend}</span>
                  )}
                </div>
                <h3 className="text-3xl font-bold tracking-tight mb-0.5">{stat.value}</h3>
                <p className="text-[13px] text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">Quick Actions</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action, i) => {
                const content = (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center text-violet-300 mb-3 group-hover:bg-violet-500/15 group-hover:text-violet-300 transition">
                      {action.icon}
                    </div>
                    <p className="font-semibold text-sm mb-0.5">{action.label}</p>
                    <p className="text-[12px] text-white/35 leading-snug">{action.desc}</p>
                  </>
                );
                return action.href ? (
                  <Link key={i} href={action.href} className="group bg-[#111117] border border-white/[0.07] hover:border-violet-400/30 rounded-xl p-5 transition">
                    {content}
                  </Link>
                ) : (
                  <button key={i} className="group text-left bg-[#111117] border border-white/[0.07] hover:border-violet-400/30 rounded-xl p-5 transition">
                    {content}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#111117] border border-white/[0.07] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-4 h-4 text-violet-300" />
              <h3 className="text-sm font-semibold text-white/70">How NovaTube AI works</h3>
            </div>
            <p className="text-[12px] text-white/35 mb-6">From idea to published video, fully automated.</p>
            <div className="flex flex-wrap items-stretch gap-2">
              {workflow.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center text-center w-[92px]">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-lg mb-2">
                      {step.icon}
                    </div>
                    <p className="text-[12px] font-semibold">{step.label}</p>
                    <p className="text-[10px] text-white/35 leading-tight">{step.desc}</p>
                  </div>
                  {i < workflow.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0 -mt-6" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111117] border border-violet-400/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-wide text-violet-300">AI Working</span>
              </div>
              <span className="text-[12px] text-white/35">64%</span>
            </div>
            <p className="text-sm text-white/70 mb-3">Generating your script…</p>
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full w-[64%] bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full transition-all duration-500" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}