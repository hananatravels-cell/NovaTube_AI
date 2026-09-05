'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, FileText, Mic, Video, Image as ImageIcon, TrendingUp, Settings,
  Bell, Search, LogOut, Play, Sparkles, CheckCircle2, XCircle, Loader2, Circle,
  Globe, MessageCircle, Camera, Music2, Download, Copy, Check, Plus, X, Trash2, Tv, Activity,
} from 'lucide-react';

type StageStatus = 'waiting' | 'working' | 'completed' | 'failed';

interface Stage {
  id: string;
  label: string;
  emoji: string;
  status: StageStatus;
  available: boolean;
}

interface SeoResult {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
}

interface Channel {
  id: string;
  name: string;
  niche: string;
  category: string;
  youtubeAccount: string;
  createdAt: string;
}

const INITIAL_STAGES: Stage[] = [
  { id: 'topic', label: 'Finding Trending Topic', emoji: '🔥', status: 'waiting', available: true },
  { id: 'script', label: 'Writing Script', emoji: '✍️', status: 'waiting', available: true },
  { id: 'voice', label: 'Creating Voice', emoji: '🎙️', status: 'waiting', available: true },
  { id: 'music', label: 'Adding Music', emoji: '🎵', status: 'waiting', available: true },
  { id: 'video', label: 'Creating Visuals & Rendering', emoji: '🎬', status: 'waiting', available: true },
  { id: 'thumbnail', label: 'Creating Thumbnail', emoji: '🖼️', status: 'waiting', available: true },
  { id: 'seo', label: 'Optimizing SEO', emoji: '🔍', status: 'waiting', available: true },
  { id: 'schedule', label: 'Scheduling', emoji: '📅', status: 'waiting', available: true },
  { id: 'publish', label: 'Publishing', emoji: '🚀', status: 'waiting', available: true },
];

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: Globe },
  { id: 'facebook', name: 'Facebook', icon: MessageCircle },
  { id: 'instagram', name: 'Instagram', icon: Camera },
  { id: 'tiktok', name: 'TikTok', icon: Music2 },
];

// Sensible defaults for how many Shorts to auto-generate from each
// long video, and how many hours apart to schedule them (so the
// channel posts steadily through the day instead of dumping every
// Short at once). Both are user-adjustable in the UI — these are just
// the starting values.
const DEFAULT_NUM_SHORTS = 4;
const DEFAULT_SHORT_GAP_HOURS = 4;

const DURATION_OPTIONS = [
  { minutes: 0.5, label: '30s' },
  { minutes: 1, label: '1 min' },
  { minutes: 3, label: '3 min' },
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 25, label: '25 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '60 min' },
];

const LANGUAGE_OPTIONS = [
  { id: 'english', label: 'English' },
  { id: 'urdu', label: 'Urdu' },
  { id: 'roman_urdu', label: 'Roman Urdu' },
  { id: 'arabic', label: 'Arabic' },
];

const VOICE_OPTIONS = [
  { id: 'aria', label: 'Aria — Warm & Clear' },
  { id: 'noah', label: 'Noah — Deep & Confident' },
  { id: 'maya', label: 'Maya — Bright & Energetic' },
  { id: 'zayn', label: 'Zayn — Calm & Reflective' },
];

// 50 curated niche presets shown in the dropdown. Each is mapped directly
// to one of the 20 backend categories (video footage / music / thumbnail
// style) so picking a preset guarantees correct matching, instead of
// relying on keyword-detection against free-typed text.
const NICHE_PRESETS: { label: string; category: string }[] = [
  { label: 'AI & Technology', category: 'tech' },
  { label: 'Make Money Online', category: 'finance' },
  { label: 'Personal Finance', category: 'finance' },
  { label: 'Business & Entrepreneurship', category: 'finance' },
  { label: 'Self Improvement', category: 'motivation' },
  { label: 'Motivation', category: 'motivation' },
  { label: 'Health & Fitness', category: 'fitness' },
  { label: 'Weight Loss', category: 'fitness' },
  { label: 'Gaming', category: 'gaming' },
  { label: 'Celebrity News', category: 'current_affairs' },
  { label: 'Sports', category: 'storytelling' },
  { label: 'Football', category: 'storytelling' },
  { label: 'Cricket', category: 'storytelling' },
  { label: 'True Crime', category: 'horror' },
  { label: 'Mystery & Conspiracy', category: 'horror' },
  { label: 'History', category: 'history' },
  { label: 'Science', category: 'education' },
  { label: 'Space & Astronomy', category: 'education' },
  { label: 'Psychology', category: 'motivation' },
  { label: 'Relationships', category: 'motivation' },
  { label: 'Luxury Lifestyle', category: 'fashion' },
  { label: 'Travel', category: 'travel' },
  { label: 'Food & Recipes', category: 'cooking' },
  { label: 'Cars & Automobiles', category: 'automotive' },
  { label: 'Gadgets & Reviews', category: 'tech' },
  { label: 'Education', category: 'education' },
  { label: 'Productivity', category: 'motivation' },
  { label: 'News & Current Affairs', category: 'current_affairs' },
  { label: 'Islamic Stories & History', category: 'islamic' },
  { label: 'Kids Stories', category: 'storytelling' },
  { label: 'Storytelling', category: 'storytelling' },
  { label: 'Bedtime Stories', category: 'deep_sleep' },
  { label: 'Moral Stories for Kids', category: 'parenting' },
  { label: 'Fairy Tales', category: 'storytelling' },
  { label: 'Adventure Stories', category: 'storytelling' },
  { label: 'Horror Stories', category: 'horror' },
  { label: 'Mystery Stories', category: 'horror' },
  { label: 'Inspirational Stories', category: 'motivation' },
  { label: 'Animal Stories', category: 'nature' },
  { label: 'Historical Stories', category: 'history' },
  { label: 'Short Stories', category: 'storytelling' },
  { label: 'Life Lessons', category: 'motivation' },
  { label: 'Parenting', category: 'parenting' },
  { label: 'DIY & Crafts', category: 'education' },
  { label: 'Home & Garden', category: 'nature' },
  { label: 'Fashion & Beauty', category: 'beauty' },
  { label: 'Pets & Animals', category: 'nature' },
  { label: 'Documentary', category: 'education' },
  { label: 'Facts & Trivia', category: 'education' },
  { label: 'Nature & Wildlife', category: 'nature' },
];

const NICHE_CATEGORY_MAP: { keywords: string[]; category: string }[] = [
  { keywords: ['islam', 'quran', 'muslim', 'ramadan', 'mosque', 'deen', 'hadith'], category: 'islamic' },
  { keywords: ['motivation', 'inspire', 'success', 'mindset', 'self help', 'self-help'], category: 'motivation' },
  { keywords: ['tech', 'technology', 'ai', 'software', 'gadget', 'coding', 'programming'], category: 'tech' },
  { keywords: ['fitness', 'gym', 'workout', 'exercise', 'bodybuilding', 'health'], category: 'fitness' },
  { keywords: ['travel', 'tourism', 'vacation', 'trip', 'destination'], category: 'travel' },
  { keywords: ['history', 'historical', 'ancient', 'archive'], category: 'history' },
  { keywords: ['news', 'current affairs', 'politics', 'economy'], category: 'current_affairs' },
  { keywords: ['cooking', 'food', 'recipe', 'kitchen', 'chef'], category: 'cooking' },
  { keywords: ['sleep', 'relax', 'calm', 'meditation', 'asmr'], category: 'deep_sleep' },
  { keywords: ['finance', 'money', 'invest', 'investing', 'stock market', 'trading', 'business'], category: 'finance' },
  { keywords: ['gaming', 'games', 'esports', 'gamer', 'playstation', 'xbox', 'pc game'], category: 'gaming' },
  { keywords: ['comedy', 'funny', 'humor', 'joke', 'meme'], category: 'comedy' },
  { keywords: ['beauty', 'makeup', 'skincare', 'cosmetics'], category: 'beauty' },
  { keywords: ['fashion', 'clothing', 'style', 'outfit', 'runway'], category: 'fashion' },
  { keywords: ['education', 'learning', 'study', 'school', 'university', 'tutorial'], category: 'education' },
  { keywords: ['nature', 'wildlife', 'animals', 'forest', 'jungle'], category: 'nature' },
  { keywords: ['horror', 'scary', 'mystery', 'creepy', 'paranormal'], category: 'horror' },
  { keywords: ['parenting', 'family', 'kids', 'children', 'baby'], category: 'parenting' },
  { keywords: ['car', 'cars', 'automotive', 'vehicle', 'driving', 'racing'], category: 'automotive' },
  { keywords: ['sport', 'sports', 'athlete', 'football', 'cricket'], category: 'storytelling' },
];

function detectCategory(niche: string): string {
  const lower = niche.toLowerCase();
  for (const entry of NICHE_CATEGORY_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.category;
    }
  }
  return 'storytelling';
}

// Sensible default video length (in minutes) per niche, used to
// pre-fill the duration selector when a niche/channel is picked. This
// is only a starting suggestion — the person can still click any
// other duration button afterward to override it for that run.
const NICHE_DEFAULT_DURATION: { keywords: string[]; minutes: number }[] = [
  { keywords: ['true crime'], minutes: 15 },
  { keywords: ['history', 'historical stor', 'documentary'], minutes: 15 },
  { keywords: ['mystery'], minutes: 10 },
  { keywords: ['finance', 'business', 'entrepreneur', 'make money'], minutes: 10 },
  { keywords: ['ai & technology', 'ai and technology', 'gadget'], minutes: 10 },
  { keywords: ['science', 'space & astronomy', 'space and astronomy', 'education'], minutes: 10 },
  { keywords: ['kids stor', 'moral stor', 'fairy tale', 'bedtime', 'short stor'], minutes: 5 },
  { keywords: ['facts & trivia', 'facts and trivia', 'trivia'], minutes: 5 },
  { keywords: ['home & garden', 'home and garden', 'diy & crafts', 'diy and crafts', 'food & recipes', 'food and recipes'], minutes: 5 },
  { keywords: ['pets & animals', 'pets and animals', 'animal stor', 'nature & wildlife', 'nature and wildlife'], minutes: 5 },
  { keywords: ['news & current affairs', 'news and current affairs', 'celebrity news'], minutes: 5 },
];

function getDefaultDurationForNiche(nicheLabel: string): number {
  const lower = nicheLabel.toLowerCase();
  for (const entry of NICHE_DEFAULT_DURATION) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.minutes;
    }
  }
  return 5; // generic fallback default for niches not explicitly listed
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'novatube-video';
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  try {
    const blob = dataUrlToBlob(dataUrl);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
  } catch (e) {
    console.error('Download failed:', e);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Given a preferred time of day ("HH:MM"), interpreted in a specific
// target time zone (default: US Eastern — the channels here target a
// US audience), returns an ISO timestamp for the next occurrence of
// that time in that zone — today if it hasn't passed yet there,
// otherwise tomorrow. Used to auto-schedule the main video at a
// consistent daily time (in the audience's local evening) rather than
// publishing the moment it finishes rendering here in Pakistan time,
// since a steady posting schedule helps viewers build a habit of
// checking back (YouTube hasn't confirmed the algorithm itself
// rewards a fixed time, but consistency is widely considered good
// practice among creators). Uses Intl.DateTimeFormat so US Eastern's
// daylight-saving switch (EST/EDT) is handled automatically.
function computeNextPublishTime(timeHHMM: string, timeZone: string = 'America/New_York'): string {
  const [hh, mm] = timeHHMM.split(':').map(Number);
  const now = new Date();

  // Read "now" as wall-clock date/time in the target zone.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const y = get('year');
  const mo = get('month');
  const d = get('day');
  const H = get('hour');
  const Mi = get('minute');
  const S = get('second');

  // Figure out the target zone's current UTC offset by comparing the
  // real "now" epoch to what you'd get if those wall-clock numbers
  // were (incorrectly) treated as UTC.
  const asUtcIfLocalWereUtc = Date.UTC(y, mo - 1, d, H, Mi, S);
  const offsetMs = now.getTime() - asUtcIfLocalWereUtc;

  // Build today's target time in the zone using the same trick, then
  // apply the offset to get the real UTC epoch.
  let targetEpoch = Date.UTC(y, mo - 1, d, hh || 0, mm || 0, 0) + offsetMs;
  if (targetEpoch <= now.getTime()) {
    targetEpoch += 24 * 60 * 60 * 1000;
  }
  return new Date(targetEpoch).toISOString();
}

// Polls the render job status endpoint until it finishes (or fails).
// This replaces waiting on one long blocking HTTP request: the video
// service now returns a job_id immediately and does the actual work
// in the background, reporting live progress. A job only gets treated
// as hung if the backend itself detects no progress for a while
// (STALL_SECONDS in video_service.py) — not because of a fixed
// client-side timer here.
async function pollVideoJob(
  jobId: string,
  onProgress?: (stage: string, scenesDone: number, scenesTotal: number) => void
): Promise<{ video: string; duration: number; musicUsed: boolean }> {
  const POLL_INTERVAL_MS = 4000;

  while (true) {
    const res = await fetch(`/api/agent/video-status/${jobId}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Could not check render status');
    }

    if (onProgress) {
      onProgress(data.stage || '', data.scenesDone ?? 0, data.scenesTotal ?? 0);
    }

    if (data.status === 'done') {
      return {
        video: data.video,
        duration: data.duration,
        musicUsed: !!data.musicUsed,
      };
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Video rendering failed');
    }

    // status === 'running' — wait and poll again
    await sleep(POLL_INTERVAL_MS);
  }
}

// Extracts several candidate frames from the generated video at
// different points, scores each one for visual "punch" (contrast +
// color vividness), and automatically picks the strongest one.
// Overlays a bold, colorful hook-text banner on the winning frame.
// Fully local (no external API call), so it's fast and never times out.
function generateThumbnailFromVideo(videoDataUrl: string, overlayText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.src = videoDataUrl;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Video frame extraction timed out'));
    }, 20000);

    // Candidate points along the video to sample a frame from.
    const CANDIDATE_FRACTIONS = [0.15, 0.35, 0.55, 0.75];

    function scoreFrame(canvas: HTMLCanvasElement): number {
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Sample a subset of pixels for speed, measuring luminance
      // variance (contrast) plus average color saturation — a higher
      // score means a more visually striking, punchier frame.
      let sumLum = 0;
      let sumLumSq = 0;
      let sumSat = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 20 * 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        sumLum += lum;
        sumLumSq += lum * lum;
        sumSat += sat;
        count++;
      }
      if (count === 0) return 0;
      const meanLum = sumLum / count;
      const variance = sumLumSq / count - meanLum * meanLum;
      const meanSat = sumSat / count;
      return variance * 0.7 + meanSat * 10000 * 0.3;
    }

    function captureFrameAt(fraction: number): Promise<HTMLCanvasElement | null> {
      return new Promise((res) => {
        const target = Math.min(video.duration * fraction, video.duration - 0.1);
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { res(null); return; }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            res(canvas);
          } catch {
            res(null);
          }
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = isFinite(target) && target > 0 ? target : 0;
      });
    }

    video.onloadedmetadata = async () => {
      try {
        const candidates: HTMLCanvasElement[] = [];
        for (const frac of CANDIDATE_FRACTIONS) {
          const canvas = await captureFrameAt(frac);
          if (canvas) candidates.push(canvas);
        }
        clearTimeout(timeoutId);

        if (candidates.length === 0) {
          cleanup();
          reject(new Error('Could not extract any candidate frames'));
          return;
        }

        // Pick whichever candidate scores highest for visual punch.
        let best = candidates[0];
        let bestScore = scoreFrame(best);
        for (const c of candidates.slice(1)) {
          const s = scoreFrame(c);
          if (s > bestScore) {
            best = c;
            bestScore = s;
          }
        }

        const canvas = best;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Dark gradient overlay at the bottom for text readability
        const bgGradient = ctx.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height);
        bgGradient.addColorStop(0, 'rgba(0,0,0,0)');
        bgGradient.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45);

        // Hook text overlay — bold, colorful, universal font stack
        const text = overlayText.toUpperCase();
        const baseFontSize = Math.round(canvas.width * (text.length > 20 ? 0.055 : 0.075));
        ctx.font = `900 ${baseFontSize}px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = Math.max(4, Math.round(baseFontSize * 0.1));
        ctx.strokeStyle = 'black';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Wrap text if too long for canvas width
        const maxWidth = canvas.width * 0.9;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = baseFontSize * 1.15;
        const startY = canvas.height - 40 - (lines.length - 1) * lineHeight;

        // Colorful gradient fill (yellow -> orange -> red) for a
        // punchy, attention-grabbing look instead of plain white text.
        const textGradient = ctx.createLinearGradient(
          0, startY - baseFontSize,
          0, startY + (lines.length - 1) * lineHeight + baseFontSize * 0.3
        );
        textGradient.addColorStop(0, '#FFF176');
        textGradient.addColorStop(0.5, '#FFB300');
        textGradient.addColorStop(1, '#FF5252');

        lines.forEach((line, i) => {
          const y = startY + i * lineHeight;
          ctx.strokeText(line, canvas.width / 2, y);
          ctx.fillStyle = textGradient;
          ctx.fillText(line, canvas.width / 2, y);
        });

        cleanup();
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error('Thumbnail generation failed'));
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error('Failed to load video for thumbnail extraction'));
    };
  });
}

export default function AIContentAgentPage() {
  const [activeTab] = useState('agent');
  const [niche, setNiche] = useState('');
  const [nicheCategoryOverride, setNicheCategoryOverride] = useState<string | null>(null);
  const [showNicheDropdown, setShowNicheDropdown] = useState(false);
  const nicheBoxRef = useRef<HTMLDivElement>(null);
  // Synchronous guard against double-starting a render — a fast
  // double-click can fire handleStart twice before React re-renders
  // the disabled button, which previously caused the same video to be
  // generated and published twice. A ref updates immediately (unlike
  // state), so the second call is blocked before any work begins.
  const isStartingRef = useRef(false);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelNicheIdx, setNewChannelNicheIdx] = useState(0);
  const [newChannelYoutubeAccount, setNewChannelYoutubeAccount] = useState('default');
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [selectedYoutubeAccount, setSelectedYoutubeAccount] = useState('default');

  const [durationMinutes, setDurationMinutes] = useState(5);
  const [language, setLanguage] = useState('english');
  const [voice, setVoice] = useState('aria');
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>(['youtube']);
  const [isRunning, setIsRunning] = useState(false);
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [resultTopic, setResultTopic] = useState('');
  const [bankRemaining, setBankRemaining] = useState<number | null>(null);
  const [resultVideo, setResultVideo] = useState('');
  const [resultThumbnail, setResultThumbnail] = useState('');
  const [resultSeo, setResultSeo] = useState<SeoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const alreadyDownloadedFor = useRef<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [publishError, setPublishError] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<{ title: string; reason: string }[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingError, setTrendingError] = useState('');
  const [videoProgress, setVideoProgress] = useState('');
  const [autoPublish, setAutoPublish] = useState(true);
  const [shortsStatus, setShortsStatus] = useState('');
  const [numShorts, setNumShorts] = useState(DEFAULT_NUM_SHORTS);
  const [shortGapHours, setShortGapHours] = useState(DEFAULT_SHORT_GAP_HOURS);
  const [preferredPublishTime, setPreferredPublishTime] = useState('21:00');

  const sidebarItems = [
    { name: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, id: 'overview', href: '/dashboard' },
    { name: 'AI Content Agent', icon: <Sparkles className="w-5 h-5" />, id: 'agent', href: '/dashboard/agent' },
    { name: 'AI Scripts', icon: <FileText className="w-5 h-5" />, id: 'scripts', href: '/dashboard/scripts' },
    { name: 'Voice Generator', icon: <Mic className="w-5 h-5" />, id: 'voice', href: '/dashboard/voice' },
    { name: 'Video Generator', icon: <Video className="w-5 h-5" />, id: 'video', href: '/dashboard/video' },
    { name: 'Thumbnails', icon: <ImageIcon className="w-5 h-5" />, id: 'thumbnails', href: '/dashboard/thumbnails' },
    { name: 'Analytics', icon: <TrendingUp className="w-5 h-5" />, id: 'analytics', href: '/dashboard' },
    { name: 'Connections', icon: <Tv className="w-5 h-5" />, id: 'connections', href: '/dashboard/connections' },
    { name: 'Platform Status', icon: <Activity className="w-5 h-5" />, id: 'status', href: '/dashboard/status' },
    { name: 'Settings', icon: <Settings className="w-5 h-5" />, id: 'settings', href: '/dashboard' },
  ];

  useEffect(() => {
    fetch('/api/channels')
      .then((r) => r.json())
      .then((data) => setChannels(Array.isArray(data.channels) ? data.channels : []))
      .catch(() => setChannels([]))
      .finally(() => setChannelsLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (nicheBoxRef.current && !nicheBoxRef.current.contains(e.target as Node)) {
        setShowNicheDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function updateStage(id: string, status: StageStatus) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  function togglePlatform(id: string) {
    setEnabledPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    });
  }

  function pickNichePreset(preset: { label: string; category: string }) {
    setNiche(preset.label);
    setNicheCategoryOverride(preset.category);
    setShowNicheDropdown(false);
    // Pre-fill a sensible default duration for this niche — the person
    // can still click a different duration button afterward to override.
    setDurationMinutes(getDefaultDurationForNiche(preset.label));
    // Picking a niche from the dropdown means the content no longer
    // matches whatever channel was previously selected — clear the
    // channel selection so publishing can't silently go to the wrong
    // YouTube account. The person has to explicitly re-select a
    // channel (or leave it unselected, which disables auto-publish)
    // before this new niche can be auto-published.
    setSelectedChannelId(null);
    setSelectedYoutubeAccount('default');
  }

  function handleNicheTyping(value: string) {
    setNiche(value);
    setNicheCategoryOverride(null);
    // Typing a custom niche means we're no longer tied to a saved
    // channel's account — reset to "default" and clear the selected
    // channel highlight so it's obvious no specific channel is active.
    setSelectedChannelId(null);
    setSelectedYoutubeAccount('default');
  }

  function selectChannel(channel: Channel) {
    setSelectedChannelId(channel.id);
    setNiche(channel.niche);
    setNicheCategoryOverride(channel.category);
    setSelectedYoutubeAccount(channel.youtubeAccount || 'default');
    // Pre-fill this channel's niche default duration too — still
    // overridable by clicking a different duration button.
    setDurationMinutes(getDefaultDurationForNiche(channel.niche));
  }

  async function addChannel() {
    if (!newChannelName.trim()) return;
    const preset = NICHE_PRESETS[newChannelNicheIdx];
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelName.trim(),
          niche: preset.label,
          category: preset.category,
          youtubeAccount: newChannelYoutubeAccount.trim() || 'default',
        }),
      });
      const data = await res.json();
      if (res.ok && data.channel) {
        setChannels((prev) => [...prev, data.channel]);
        setNewChannelName('');
        setNewChannelNicheIdx(0);
        setNewChannelYoutubeAccount('default');
        setShowAddChannel(false);
        selectChannel(data.channel);
      }
    } catch (e) {
      console.error('Failed to add channel:', e);
    }
  }

  async function deleteChannel(id: string) {
    try {
      await fetch(`/api/channels?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setChannels((prev) => prev.filter((c) => c.id !== id));
      if (selectedChannelId === id) setSelectedChannelId(null);
    } catch (e) {
      console.error('Failed to delete channel:', e);
    }
  }

  useEffect(() => {
    if (resultVideo && alreadyDownloadedFor.current !== resultVideo) {
      alreadyDownloadedFor.current = resultVideo;
      const filenameBase = `novatube-${slugify(resultTopic || niche)}-${Date.now()}`;
      downloadDataUrl(resultVideo, `${filenameBase}.mp4`);
      setAutoDownloaded(true);
    }
  }, [resultVideo, resultTopic, niche]);

  async function getNextTopicFromBank(nicheValue: string): Promise<string> {
    const statusRes = await fetch(`/api/agent/topic-bank/status?niche=${encodeURIComponent(nicheValue)}`);
    const statusData = await statusRes.json();

    if (!statusData.exists || statusData.remaining === 0) {
      const genRes = await fetch('/api/agent/topic-bank/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: nicheValue }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Could not build topic bank');
    }

    const nextRes = await fetch('/api/agent/topic-bank/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche: nicheValue }),
    });
    const nextData = await nextRes.json();
    if (!nextRes.ok || !nextData.topic) {
      throw new Error(nextData.error || 'No topic available in bank');
    }

    setBankRemaining(nextData.remaining);
    return nextData.topic.text;
  }

  async function publishToYouTube(params: {
    videoBase64: string;
    thumbnailBase64?: string;
    title: string;
    description: string;
    tags: string[];
    account: string;
    publishAt?: string;
  }) {
    setIsPublishing(true);
    setPublishError('');
    setPublishedUrl('');
    updateStage('publish', 'working');
    try {
      const res = await fetch('/api/agent/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64: params.videoBase64,
          thumbnailBase64: params.thumbnailBase64 || undefined,
          title: params.title,
          description: params.description,
          tags: params.tags,
          account: params.account,
          publishAt: params.publishAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      updateStage('publish', 'completed');
      setPublishedUrl(data.videoUrl || `https://youtube.com/watch?v=${data.videoId}`);
    } catch (err: any) {
      setPublishError(err.message || 'Publish failed');
      updateStage('publish', 'failed');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleStart() {
    if (!niche.trim()) return;
    // Safety check: auto-publish must not silently fall back to the
    // "default" account (the original channel) just because no
    // channel chip was selected — require an explicit channel pick
    // first so publishing always goes to the intended channel.
    if (autoPublish && !selectedChannelId) return;
    // Block a second overlapping run (e.g. a fast double-click) —
    // checked synchronously via a ref so it takes effect immediately,
    // before React has re-rendered the disabled button.
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    setIsRunning(true);
    setErrorMsg('');
    setResultTopic('');
    setResultVideo('');
    setResultThumbnail('');
    setResultSeo(null);
    setAutoDownloaded(false);
    setVideoProgress('');
    setShortsStatus('');
    alreadyDownloadedFor.current = '';
    setStages(INITIAL_STAGES.map((s) => ({ ...s, status: 'waiting' })));

    let topicValue = '';
    let scriptValue = '';
    let sceneList: string[] = [];
    let thumbnailPrompt = '';
    let thumbnailText = '';
    const detectedCategory = nicheCategoryOverride || detectCategory(niche);

    try {
      updateStage('topic', 'working');
      topicValue = await getNextTopicFromBank(niche);
      updateStage('topic', 'completed');
      setResultTopic(topicValue);

      updateStage('script', 'working');
      const scriptRes = await fetch('/api/agent/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicValue, durationMinutes, language }),
      });
      const scriptData = await scriptRes.json();
      if (!scriptRes.ok) throw new Error(scriptData.error || 'Script step failed');
      scriptValue = scriptData.script;

      try {
        const voiceSelectRes = await fetch('/api/agent/voice-select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topicValue, category: detectedCategory }),
        });
        const voiceSelectData = await voiceSelectRes.json();
        if (voiceSelectData?.voice) {
          setVoice(voiceSelectData.voice);
        }
      } catch (voiceSelectErr) {
        console.error('voice-select error:', voiceSelectErr);
      }

      try {
        const scenesRes = await fetch('/api/agent/scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topicValue, script: scriptValue, category: detectedCategory }),
        });
        const scenesData = await scenesRes.json();
        if (scenesRes.ok && Array.isArray(scenesData.scenes) && scenesData.scenes.length > 0) {
          sceneList = scenesData.scenes;
          thumbnailPrompt = scenesData.thumbnailPrompt || topicValue;
          thumbnailText = scenesData.thumbnailText || 'WATCH NOW';
        } else {
          thumbnailPrompt = topicValue;
          thumbnailText = 'WATCH NOW';
        }
      } catch (scenesErr) {
        console.error('Scene planning failed, falling back to raw script splitting:', scenesErr);
        thumbnailPrompt = topicValue;
        thumbnailText = 'WATCH NOW';
      }

      updateStage('script', 'completed');

      updateStage('voice', 'working');
      const voiceRes = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptValue,
          voice: VOICE_OPTIONS.find((v) => v.id === voice)?.label || 'Aria — Warm & Clear',
          language: LANGUAGE_OPTIONS.find((l) => l.id === language)?.label || 'English',
        }),
      });
      const voiceData = await voiceRes.json();
      if (!voiceRes.ok) throw new Error(voiceData.error || 'Voice step failed');
      updateStage('voice', 'completed');

      updateStage('music', 'working');
      updateStage('video', 'working');

      let introAudioBase64 = '';
      const introTextMap: Record<string, string> = {
        english: `Today, let's talk about ${topicValue}.`,
        urdu: `آج ہم بات کریں گے ${topicValue} کے بارے میں۔`,
        roman_urdu: `Aaj hum baat karenge ${topicValue} ke baare mein.`,
        arabic: `اليوم سنتحدث عن ${topicValue}.`,
      };
      const introText = introTextMap[language] || introTextMap.english;

      try {
        const introVoiceRes = await fetch('/api/generate-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: introText,
            voice: VOICE_OPTIONS.find((v) => v.id === voice)?.label || 'Aria — Warm & Clear',
            language: LANGUAGE_OPTIONS.find((l) => l.id === language)?.label || 'English',
          }),
        });
        const introVoiceData = await introVoiceRes.json();
        if (introVoiceRes.ok && introVoiceData?.audio) {
          introAudioBase64 = introVoiceData.audio;
        }
      } catch (introErr) {
        console.error('intro voice error:', introErr);
      }

      // Start the render as a background job — /api/agent/video now
      // returns a jobId immediately instead of holding this request
      // open for the whole render.
      const startRes = await fetch('/api/agent/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: scriptValue,
          audioBase64: voiceData.audio,
          category: detectedCategory,
          orientation: 'horizontal',
          title: topicValue,
          scenes: sceneList.length > 0 ? sceneList : undefined,
          introAudioBase64: introAudioBase64 || undefined,
          introText,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Video step failed to start');
      const jobId = startData.jobId;
      if (!jobId) throw new Error('Video service did not return a job id');

      // Poll for progress until the render finishes (or fails). The
      // backend fails the job itself if it stalls — no fixed client
      // timeout here, so a slow-but-healthy render is never killed.
      const videoData = await pollVideoJob(jobId, (stage, scenesDone, scenesTotal) => {
        if (scenesTotal > 0) {
          setVideoProgress(`${stage.replace(/_/g, ' ')} (${scenesDone}/${scenesTotal} scenes)`);
        } else if (stage) {
          setVideoProgress(stage.replace(/_/g, ' '));
        }
      });

      setVideoProgress('');
      updateStage('video', 'completed');
      updateStage('music', videoData.musicUsed ? 'completed' : 'failed');
      setResultVideo(videoData.video);

      updateStage('thumbnail', 'working');
      let thumbDataUrlLocal = '';
      try {
        thumbDataUrlLocal = await generateThumbnailFromVideo(videoData.video, thumbnailText);
        setResultThumbnail(thumbDataUrlLocal);
        updateStage('thumbnail', 'completed');
        downloadDataUrl(thumbDataUrlLocal, `novatube-thumb-${slugify(topicValue)}-${Date.now()}.jpg`);
      } catch (thumbErr) {
        console.error('Thumbnail generation failed:', thumbErr);
        updateStage('thumbnail', 'failed');
      }

      updateStage('seo', 'working');
      let seoDataLocal: SeoResult | null = null;
      try {
        const seoRes = await fetch('/api/agent/seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topicValue, script: scriptValue }),
        });
        const seoData = await seoRes.json();
        if (!seoRes.ok) throw new Error(seoData.error || 'SEO step failed');
        seoDataLocal = seoData;
        setResultSeo(seoData);
        updateStage('seo', 'completed');
      } catch (seoErr) {
        console.error('SEO generation failed:', seoErr);
        updateStage('seo', 'failed');
      }

      updateStage('schedule', 'failed');

      // If auto-publish is enabled, publish immediately using the
      // values just generated in this run. (Guarded above: this only
      // runs when a channel was explicitly selected, so it never
      // silently uses the "default" account.)
      if (autoPublish) {
        // Schedule the main video for the next occurrence of the
        // preferred daily upload time, rather than publishing the
        // instant it finishes rendering — a consistent schedule helps
        // build viewer habit, and it also gives a predictable anchor
        // point for the Shorts scheduled below to spread out from.
        const mainPublishAt = computeNextPublishTime(preferredPublishTime);
        const mainPublishAtMs = new Date(mainPublishAt).getTime();

        await publishToYouTube({
          videoBase64: videoData.video,
          thumbnailBase64: thumbDataUrlLocal || undefined,
          title: seoDataLocal?.title || topicValue || niche,
          description: seoDataLocal?.description || '',
          tags: seoDataLocal?.tags || [],
          account: selectedYoutubeAccount,
          publishAt: mainPublishAt,
        });

        // Also carve this long video into a handful of Shorts and
        // schedule them a few hours apart *starting from the main
        // video's scheduled time*, so the channel keeps posting
        // steadily through the day after the main upload goes live.
        // Each Short gets its own thumbnail (same scoring + hook-text
        // overlay as the main video). Failures here are logged but
        // don't fail the overall run — the long video is already
        // scheduled either way.
        try {
          setShortsStatus('Generating Shorts…');
          const shortsRes = await fetch('/api/agent/auto-short', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_base64: videoData.video,
              category: detectedCategory,
              num_shorts: numShorts,
              aspect_ratio: '9:16',
            }),
          });
          const shortsData = await shortsRes.json();
          const shorts: { video: string }[] = shortsRes.ok && Array.isArray(shortsData.shorts) ? shortsData.shorts : [];

          for (let i = 0; i < shorts.length; i++) {
            setShortsStatus(`Scheduling Short ${i + 1}/${shorts.length}…`);
            let shortThumb = '';
            try {
              shortThumb = await generateThumbnailFromVideo(shorts[i].video, thumbnailText);
            } catch (shortThumbErr) {
              console.error(`Short ${i + 1} thumbnail failed:`, shortThumbErr);
            }

            const publishAt = new Date(mainPublishAtMs + (i + 1) * shortGapHours * 60 * 60 * 1000).toISOString();
            const baseTitle = seoDataLocal?.title || topicValue || niche;

            try {
              await fetch('/api/agent/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  videoBase64: shorts[i].video,
                  thumbnailBase64: shortThumb || undefined,
                  title: `${baseTitle} #Shorts`,
                  description: seoDataLocal?.description || '',
                  tags: seoDataLocal?.tags || [],
                  account: selectedYoutubeAccount,
                  publishAt,
                }),
              });
            } catch (shortPublishErr) {
              console.error(`Short ${i + 1} scheduling failed:`, shortPublishErr);
            }
          }
          setShortsStatus(shorts.length > 0 ? `${shorts.length} Shorts scheduled` : '');
        } catch (shortsErr) {
          console.error('Auto-short generation failed:', shortsErr);
          setShortsStatus('Shorts generation failed');
        }
      }
    } catch (err: any) {
      setVideoProgress('');
      setErrorMsg(err.message || 'Something went wrong');
      setStages((prev) => prev.map((s) => (s.status === 'working' ? { ...s, status: 'failed' } : s)));
    } finally {
      setIsRunning(false);
      isStartingRef.current = false;
    }
  }

  async function handlePublish() {
    if (!resultVideo) return;
    await publishToYouTube({
      videoBase64: resultVideo,
      thumbnailBase64: resultThumbnail || undefined,
      title: resultSeo?.title || resultTopic || niche,
      description: resultSeo?.description || '',
      tags: resultSeo?.tags || [],
      account: selectedYoutubeAccount,
    });
  }

  async function handleSchedule() {
    if (!resultVideo || !scheduleDate) return;
    setIsScheduling(true);
    setScheduleSuccess('');
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_base64: resultVideo,
          thumbnail_base64: resultThumbnail || undefined,
          title: resultSeo?.title || resultTopic || niche,
          description: resultSeo?.description || '',
          tags: resultSeo?.tags || [],
          scheduledAt: new Date(scheduleDate).toISOString(),
          type: 'long',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Schedule failed');
      setScheduleSuccess(`Scheduled for ${new Date(scheduleDate).toLocaleString()}`);
      setShowScheduleForm(false);
    } catch (err: any) {
      alert(err.message || 'Schedule failed');
    } finally {
      setIsScheduling(false);
    }
  }

  async function fetchTrendingTopics() {
    if (!niche.trim()) return;
    setLoadingTrending(true);
    setTrendingError('');
    setTrendingTopics([]);
    try {
      const res = await fetch('/api/agent/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch trending topics');
      setTrendingTopics(data.topics || []);
    } catch (err: any) {
      setTrendingError(err.message || 'Failed to fetch trending topics');
    } finally {
      setLoadingTrending(false);
    }
  }

  function StageIcon({ stage }: { stage: Stage }) {
    if (!stage.available) return <span className="text-[11px] text-white/25 font-medium">Coming soon</span>;
    if (stage.status === 'working') return <Loader2 className="w-5 h-5 text-violet-300 animate-spin" />;
    if (stage.status === 'completed') return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    if (stage.status === 'failed') return <XCircle className="w-5 h-5 text-rose-400" />;
    return <Circle className="w-5 h-5 text-white/20" />;
  }

  function CopyButton({ text, field }: { text: string; field: string }) {
    const isCopied = copiedField === field;
    return (
      <button
        type="button"
        onClick={() => copyToClipboard(text, field)}
        className="flex items-center gap-1 text-[10px] font-semibold text-white/40 hover:text-white/80 transition"
      >
        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        {isCopied ? 'Copied' : 'Copy'}
      </button>
    );
  }

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
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-300" /> AI Content Agent
            </h1>
            <p className="text-sm text-white/35">Give it a niche. It handles the rest.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/shorts"
              className="flex items-center gap-2.5 bg-emerald-500/[0.18] border-2 border-emerald-400/40 text-emerald-100 text-base font-bold px-6 py-3.5 rounded-xl hover:bg-emerald-500/[0.28] transition shadow-lg shadow-emerald-500/10"
            >
              🎬 Create Shorts
            </Link>
            <div className="relative hidden lg:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="text" placeholder="Search…" className="w-64 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400/20 transition" />
            </div>
            <button className="relative p-2.5 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-xl transition">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-10 overflow-y-auto">
          {/* Channels bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Tv className="w-4 h-4" /> Your Channels
              </h3>
              <button
                type="button"
                onClick={() => setShowAddChannel((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-200 bg-violet-500/[0.12] border border-violet-400/25 rounded-lg px-3 py-1.5 hover:bg-violet-500/[0.2] transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Channel
              </button>
            </div>

            {showAddChannel && (
              <div className="bg-[#0F0F15] border border-white/[0.07] rounded-2xl p-5 mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-white/60 mb-1.5">Channel Name</label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. Hanana Islamic Shorts"
                    className="w-full rounded-lg px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400/25"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-white/60 mb-1.5">Niche</label>
                  <select
                    value={newChannelNicheIdx}
                    onChange={(e) => setNewChannelNicheIdx(Number(e.target.value))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-violet-400/25"
                  >
                    {NICHE_PRESETS.map((p, i) => (
                      <option key={p.label} value={i} className="bg-[#0F0F15]">
                        {i + 1}. {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-white/60 mb-1.5">YouTube Account</label>
                  <input
                    type="text"
                    value={newChannelYoutubeAccount}
                    onChange={(e) => setNewChannelYoutubeAccount(e.target.value)}
                    placeholder="e.g. truecrime, wealthnova"
                    className="w-full rounded-lg px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400/25"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addChannel}
                    disabled={!newChannelName.trim()}
                    className="px-4 py-2.5 rounded-lg bg-violet-500/[0.14] border border-violet-400/25 text-violet-100 text-sm font-semibold hover:bg-violet-500/[0.2] transition disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddChannel(false)}
                    className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-white/50 hover:text-white/80 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {!channelsLoading && channels.length === 0 && !showAddChannel && (
              <p className="text-xs text-white/30">No channels saved yet — add as many as you like, each with its own niche.</p>
            )}

            {channels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {channels.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-2 pl-4 pr-2 py-2 rounded-xl border transition cursor-pointer ${
                      selectedChannelId === c.id
                        ? 'bg-violet-500/[0.12] border-violet-400/30 text-white'
                        : 'bg-white/[0.02] border-white/[0.07] text-white/60 hover:text-white/90'
                    }`}
                    onClick={() => selectChannel(c)}
                  >
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-[10px] text-white/30">{c.niche}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChannel(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-rose-300 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!selectedChannelId && niche.trim() && (
              <p className="text-xs text-amber-300/70 mt-2">
                No channel selected — this run uses a freely-typed niche. Auto-publish is disabled until you pick a saved channel above.
              </p>
            )}
          </div>

          <div className="grid lg:grid-cols-[420px_600px] gap-8 items-start">
            <div className="bg-[#0F0F15] border border-white/[0.07] rounded-2xl p-8">
              <h3 className="text-lg font-semibold mb-6">Start AI Content</h3>

              <div className="space-y-5">
                <div ref={nicheBoxRef} className="relative">
                  <label className="block text-sm font-semibold text-white/70 mb-2">Niche / Category</label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => handleNicheTyping(e.target.value)}
                    onFocus={() => setShowNicheDropdown(true)}
                    placeholder="Click to pick a niche, or type your own"
                    className="w-full rounded-xl px-4 py-3 text-base bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400/25"
                  />
                  <p className="text-xs text-white/25 mt-2">
                    First time using this niche builds a bank of 100 topics automatically — future runs pull from it, never repeating.
                  </p>
                  <button
                    type="button"
                    onClick={fetchTrendingTopics}
                    disabled={!niche.trim() || loadingTrending}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-200 bg-amber-500/[0.12] border border-amber-400/25 rounded-lg px-3 py-1.5 hover:bg-amber-500/[0.2] transition disabled:opacity-40"
                  >
                    {loadingTrending ? '⏳ Checking...' : '🔥 Suggest Trending Topic'}
                  </button>

                  {trendingError && (
                    <p className="text-xs text-rose-300 mt-2">{trendingError}</p>
                  )}

                  {trendingTopics.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Suggested Topics</p>
                        <button
                          type="button"
                          onClick={() => setTrendingTopics([])}
                          className="p-1 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition"
                          aria-label="Dismiss suggestions"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {trendingTopics.map((t, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setNiche(t.title);
                              setNicheCategoryOverride(null);
                              setTrendingTopics([]);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-400/15 hover:bg-amber-500/[0.12] transition"
                          >
                            <p className="text-sm text-white/85 font-medium">{t.title}</p>
                            <p className="text-xs text-white/40 mt-0.5">{t.reason}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {showNicheDropdown && (
                    <div className="absolute z-20 mt-2 w-full max-h-72 overflow-y-auto bg-[#14141C] border border-white/[0.1] rounded-xl shadow-2xl">
                      {NICHE_PRESETS.map((p, i) => ({ ...p, num: i + 1 })).filter((p) =>
                        niche.trim() ? p.label.toLowerCase().includes(niche.toLowerCase()) : true
                      ).map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => pickNichePreset(p)}
                          className="w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm text-white/80 hover:bg-violet-500/[0.1] hover:text-white transition"
                        >
                          <span className="text-white/30 text-xs w-6 shrink-0">{p.num}.</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-3">
                    Video Duration <span className="text-white/40 font-normal">({durationMinutes} min)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {DURATION_OPTIONS.map((d) => (
                      <button
                        key={d.minutes}
                        type="button"
                        onClick={() => setDurationMinutes(d.minutes)}
                        className={`px-2 py-2.5 rounded-xl border transition text-center text-xs font-semibold ${
                          durationMinutes === d.minutes
                            ? 'bg-violet-500/[0.1] border-violet-400/25 text-white'
                            : 'bg-white/[0.02] border-white/[0.07] text-white/40'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-white/25 mt-2">
                    Pre-filled based on the selected niche — pick a different duration above to override it for this run.
                  </p>
                  {durationMinutes >= 15 && (
                    <p className="text-xs text-amber-300/70 mt-2">
                      Longer videos take significantly more time to render (many clips to fetch and stitch).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-3">Language</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {LANGUAGE_OPTIONS.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLanguage(l.id)}
                        className={`px-4 py-3 rounded-xl border transition text-left text-sm font-medium ${
                          language === l.id
                            ? 'bg-violet-500/[0.1] border-violet-400/25 text-white'
                            : 'bg-white/[0.02] border-white/[0.07] text-white/40'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-3">Voice</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {VOICE_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVoice(v.id)}
                        className={`px-4 py-3 rounded-xl border transition text-left text-sm font-medium ${
                          voice === v.id
                            ? 'bg-violet-500/[0.1] border-violet-400/25 text-white'
                            : 'bg-white/[0.02] border-white/[0.07] text-white/40'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-3">Platforms</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {PLATFORMS.map((p) => {
                      const Icon = p.icon;
                      const enabled = enabledPlatforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePlatform(p.id)}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition text-left ${
                            enabled
                              ? 'bg-violet-500/[0.1] border-violet-400/25 text-white'
                              : 'bg-white/[0.02] border-white/[0.07] text-white/40'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-white/25 mt-2">Publishing isn't connected yet — this selects intent only.</p>
                </div>

                <div>
                  <label className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPublish}
                      onChange={(e) => setAutoPublish(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                    <span className="text-sm font-medium text-white/80">Auto-publish to YouTube after render</span>
                  </label>
                  {autoPublish && !selectedChannelId && (
                    <p className="text-xs text-amber-300/70 mt-2">
                      Select a saved channel above first — auto-publish needs to know which YouTube account to use.
                    </p>
                  )}
                  {autoPublish && selectedChannelId && (
                    <p className="text-xs text-emerald-400/70 mt-2">
                      Will publish to account: {selectedYoutubeAccount}
                    </p>
                  )}
                 {autoPublish && selectedChannelId && (
                    <div className="mt-3">
                      <label className="block text-[11px] font-semibold text-white/50 mb-1.5">Preferred daily upload time (US Eastern)</label>
                      <input
                        type="time"
                        value={preferredPublishTime}
                        onChange={(e) => setPreferredPublishTime(e.target.value || '21:00')}
                        disabled={isRunning}
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-violet-400/25 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <p className="text-[11px] text-white/30 mt-1">
                        Interpreted as US Eastern Time (your audience's local evening) — scheduled for the next occurrence of this time there, instead of publishing immediately.
                      </p>
                    </div>
                  )}
                  {autoPublish && selectedChannelId && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-white/50 mb-1.5">Shorts to generate</label>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={numShorts}
                          onChange={(e) => setNumShorts(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                          className="w-full rounded-lg px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-violet-400/25"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-white/50 mb-1.5">Hours between Shorts</label>
                        <input
                          type="number"
                          min={1}
                          max={48}
                          value={shortGapHours}
                          onChange={(e) => setShortGapHours(Math.max(1, Math.min(48, Number(e.target.value) || 1)))}
                          className="w-full rounded-lg px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-violet-400/25"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="text-sm text-rose-300 bg-rose-500/[0.08] border border-rose-400/20 rounded-xl px-4 py-3">
                    {errorMsg}
                  </div>
                )}

                <button
                  onClick={handleStart}
                  disabled={!niche.trim() || isRunning || (autoPublish && !selectedChannelId)}
                  className="w-full flex items-center justify-center gap-2.5 bg-violet-500/[0.14] border border-violet-400/25 text-violet-100 text-base font-semibold py-4 rounded-xl hover:bg-violet-500/[0.2] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Working…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" /> Start AI Content
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-[#0F0F15] border border-white/[0.07] rounded-2xl p-8">
              <h3 className="text-lg font-semibold mb-6">Live AI Workflow</h3>

              <div className="space-y-2 mb-8">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition ${
                      stage.status === 'working'
                        ? 'bg-violet-500/[0.06] border-violet-400/20'
                        : stage.status === 'completed'
                        ? 'bg-emerald-500/[0.04] border-emerald-400/15'
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{stage.emoji}</span>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${stage.available ? 'text-white/85' : 'text-white/35'}`}>
                          {stage.label}
                        </span>
                        {stage.id === 'video' && stage.status === 'working' && videoProgress && (
                          <span className="text-[11px] text-white/40 capitalize">{videoProgress}</span>
                        )}
                      </div>
                    </div>
                    <StageIcon stage={stage} />
                  </div>
                ))}
              </div>

              {resultTopic && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/35">Topic Selected</p>
                    {bankRemaining !== null && (
                      <span className="text-[11px] text-white/30">{bankRemaining} left in bank</span>
                    )}
                  </div>
                  <p className="text-sm text-white/80 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">{resultTopic}</p>
                </div>
              )}

              {resultVideo && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/35">Generated Video</p>
                    <div className="flex items-center gap-3">
                      {autoDownloaded && (
                        <span className="text-[11px] text-emerald-400 font-medium">Saved to Downloads ✓</span>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadDataUrl(resultVideo, `novatube-${slugify(resultTopic || niche)}-${Date.now()}.mp4`)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-200 bg-violet-500/[0.12] border border-violet-400/25 rounded-lg px-3 py-1.5 hover:bg-violet-500/[0.2] transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Again
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem("novatube_short_source_video", resultVideo);
                          window.location.href = "/dashboard/shorts?source=ai";
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-200 bg-emerald-500/[0.12] border border-emerald-400/25 rounded-lg px-3 py-1.5 hover:bg-emerald-500/[0.2] transition"
                      >
                        🎬 Create Short
                      </button>
                    </div>
                  </div>
                  <div className="max-w-[320px] mx-auto">
                    <video
                      src={resultVideo}
                      controls
                      className="w-full max-h-[70vh] rounded-xl border border-white/[0.07] bg-black object-contain"
                    />
                  </div>
                </div>
              )}

              {resultThumbnail && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/35">Generated Thumbnail</p>
                    <button
                      type="button"
                      onClick={() => downloadDataUrl(resultThumbnail, `novatube-thumb-${slugify(resultTopic || niche)}-${Date.now()}.jpg`)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-200 bg-violet-500/[0.12] border border-violet-400/25 rounded-lg px-3 py-1.5 hover:bg-violet-500/[0.2] transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                  <div className="max-w-[320px] mx-auto">
                    <img
                      src={resultThumbnail}
                      alt="Generated thumbnail"
                      className="w-full rounded-xl border border-white/[0.07] object-contain"
                    />
                  </div>
                </div>
              )}

              {resultSeo && (
                <div className="mb-6 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/35">SEO Metadata</p>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase text-white/30">Title</span>
                      <CopyButton text={resultSeo.title} field="title" />
                    </div>
                    <p className="text-sm text-white/85">{resultSeo.title}</p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase text-white/30">Description</span>
                      <CopyButton text={resultSeo.description} field="description" />
                    </div>
                    <p className="text-sm text-white/70">{resultSeo.description}</p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase text-white/30">Tags</span>
                      <CopyButton text={resultSeo.tags.join(', ')} field="tags" />
                    </div>
                    <p className="text-sm text-white/70">{resultSeo.tags.join(', ')}</p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase text-white/30">Hashtags</span>
                      <CopyButton text={resultSeo.hashtags.join(' ')} field="hashtags" />
                    </div>
                    <p className="text-sm text-violet-300">{resultSeo.hashtags.join(' ')}</p>
                  </div>
                </div>
              )}

              {resultVideo && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="w-full flex items-center justify-center gap-2.5 bg-emerald-500/[0.14] border border-emerald-400/25 text-emerald-100 text-base font-semibold py-4 rounded-xl hover:bg-emerald-500/[0.2] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Publishing to YouTube…
                      </>
                    ) : (
                      <>
                        <Globe className="w-5 h-5" /> Publish Now (YouTube) — {selectedYoutubeAccount}
                      </>
                    )}
                  </button>
                  {shortsStatus && (
                    <p className="text-xs text-white/40 mt-2 text-center">{shortsStatus}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowScheduleForm((v) => !v)}
                    className="w-full mt-3 flex items-center justify-center gap-2.5 bg-white/[0.04] border border-white/[0.1] text-white/70 text-sm font-semibold py-3 rounded-xl hover:bg-white/[0.08] transition"
                  >
                    📅 Schedule for Later
                  </button>
                  {showScheduleForm && (
                    <div className="mt-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <label className="block text-xs text-white/50 mb-2">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] text-white mb-3"
                      />
                      <button
                        type="button"
                        onClick={handleSchedule}
                        disabled={!scheduleDate || isScheduling}
                        className="w-full bg-violet-500/[0.14] border border-violet-400/25 text-violet-100 text-sm font-semibold py-2.5 rounded-lg hover:bg-violet-500/[0.2] transition disabled:opacity-40"
                      >
                        {isScheduling ? 'Scheduling...' : 'Confirm Schedule'}
                      </button>
                    </div>
                  )}
                  {scheduleSuccess && (
                    <p className="text-xs text-emerald-400 mt-2">✅ {scheduleSuccess}</p>
                  )}
                  {publishedUrl && (
                    <a
                      href={publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 text-sm text-emerald-300 underline text-center"
                    >
                      View on YouTube ↗
                    </a>
                  )}
                  {publishError && (
                    <div className="mt-3 text-sm text-rose-300 bg-rose-500/[0.08] border border-rose-400/20 rounded-xl px-4 py-3">
                      {publishError}
                    </div>
                  )}
                </div>
              )}

              {!resultVideo && !isRunning && (
                <div className="text-center py-10 text-white/30 text-sm">
                  Enter a niche and click "Start AI Content" to see the agent work.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

