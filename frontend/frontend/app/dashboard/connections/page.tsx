'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Tv, ExternalLink, ShieldCheck } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  niche: string;
  category: string;
  youtubeAccount: string;
  createdAt: string;
}

export default function ConnectionsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/channels')
      .then((r) => r.json())
      .then((data) => setChannels(Array.isArray(data.channels) ? data.channels : []))
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#08080C] text-[#EDEDF2] font-sans">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/dashboard/agent" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Agent
        </Link>

        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
          <Tv className="w-6 h-6 text-violet-300" /> YouTube Connections
        </h1>
        <p className="text-sm text-white/40 mb-8">
          Every channel you've added, which YouTube account it publishes to, and where to manage Google permissions.
        </p>

        {/* Useful Google links */}
        <div className="bg-[#0F0F15] border border-white/[0.07] rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Google Account & Permissions
          </h2>
          <div className="space-y-2.5">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition text-sm"
            >
              <span>Google Cloud Console — OAuth Credentials</span>
              <ExternalLink className="w-4 h-4 text-white/30" />
            </a>
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition text-sm"
            >
              <span>Your Google Account — Third-Party Access</span>
              <ExternalLink className="w-4 h-4 text-white/30" />
            </a>
            <a
              href="https://studio.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition text-sm"
            >
              <span>YouTube Studio</span>
              <ExternalLink className="w-4 h-4 text-white/30" />
            </a>
          </div>
        </div>

        {/* Channels list */}
        <div className="bg-[#0F0F15] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/70 mb-4">Your Channels</h2>

          {loading && <p className="text-sm text-white/30">Loading...</p>}

          {!loading && channels.length === 0 && (
            <p className="text-sm text-white/30">No channels added yet. Go to the Agent page to add one.</p>
          )}

          {!loading && channels.length > 0 && (
            <div className="space-y-3">
              {channels.map((c) => (
                <div key={c.id} className="px-4 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-semibold text-white/90">{c.name}</span>
                    <span className="text-[11px] px-2 py-1 rounded-md bg-violet-500/[0.12] border border-violet-400/25 text-violet-200 font-medium">
                      {c.youtubeAccount}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">Niche: {c.niche}</p>
                  <p className="text-[11px] text-white/25 mt-1">
                    Added: {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-white/25 mt-4">
            Note: the "account" label above (e.g. "wealthnova") maps to a YouTube OAuth token your video service uses when publishing — it does not show the actual Gmail address here, since that's stored securely on the video service side, not in this app's channel list.
          </p>
        </div>
      </div>
    </div>
  );
}
