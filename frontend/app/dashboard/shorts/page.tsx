"use client";

import { useState, useEffect } from "react";

const CATEGORIES = [
  { value: "ai_technology", label: "AI & Technology" },
  { value: "islamic_stories", label: "Islamic Stories" },
  { value: "make_money_online", label: "Make Money Online" },
  { value: "personal_finance", label: "Personal Finance" },
  { value: "motivation", label: "Motivation" },
  { value: "health_fitness", label: "Health & Fitness" },
  { value: "true_crime", label: "True Crime" },
  { value: "history", label: "History" },
  { value: "kids_stories", label: "Kids Stories" },
  { value: "bedtime_stories", label: "Bedtime Stories" },
];

const LANGUAGES = ["English", "Urdu", "Arabic"];

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16 Vertical — YouTube Shorts, TikTok, Reels" },
  { value: "1:1", label: "1:1 Square — Instagram/Facebook Feed" },
  { value: "4:5", label: "4:5 Portrait — Instagram Feed" },
  { value: "16:9", label: "16:9 Landscape — YouTube, X" },
];

const PLATFORMS = [
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X (Twitter)" },
];

export default function ShortsStudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [aiSourceVideo, setAiSourceVideo] = useState<string | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [language, setLanguage] = useState("English");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [platforms, setPlatforms] = useState<string[]>(["youtube"]);
  const [startSeconds, setStartSeconds] = useState(0);
  const [maxDuration, setMaxDuration] = useState(59);
  const [addIntro, setAddIntro] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultVideo, setResultVideo] = useState("");

  const [numShorts, setNumShorts] = useState(1);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResults, setAutoResults] = useState<any[]>([]);
  const [autoError, setAutoError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("novatube_short_source_video");
    if (stored) {
      setAiSourceVideo(stored);
      sessionStorage.removeItem("novatube_short_source_video");
    }
  }, []);

  function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function getVideoBase64(): Promise<string | null> {
    if (aiSourceVideo) return aiSourceVideo;
    if (file) return await fileToBase64(file);
    return null;
  }

  function togglePlatform(id: string) {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    const video_base64 = await getVideoBase64();
    if (!video_base64) {
      setError("Pehle ek video select karein ya AI Content Agent se aayen.");
      return;
    }
    setError("");
    setResultVideo("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_base64,
          start_seconds: startSeconds,
          max_duration: maxDuration,
          category: addIntro ? category : null,
          language,
          aspect_ratio: aspectRatio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kuch ghalat ho gaya");
      } else {
        setResultVideo(data.video);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoShort() {
    const video_base64 = await getVideoBase64();
    if (!video_base64) {
      setAutoError("Pehle ek video select karein ya AI Content Agent se aayen.");
      return;
    }
    setAutoError("");
    setAutoResults([]);
    setAutoLoading(true);

    try {
      const res = await fetch("/api/agent/auto-short", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_base64,
          category: addIntro ? category : null,
          num_shorts: numShorts,
          aspect_ratio: aspectRatio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAutoError(data.error || "Kuch ghalat ho gaya");
      } else {
        setAutoResults(data.shorts || []);
      }
    } catch (e: any) {
      setAutoError(e?.message || "Network error");
    } finally {
      setAutoLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: "700px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
        Shorts Studio
      </h1>
      <p style={{ color: "#888", marginBottom: "24px" }}>
        Koi bhi video upload karein, Short bana lein — manually ya AI se automatic.
      </p>

      {aiSourceVideo ? (
        <div style={{ marginBottom: "16px", padding: "12px", background: "#052e1e", border: "1px solid #059669", borderRadius: "8px" }}>
          ✅ AI Content Agent se video load ho gayi hai.
          <br />
          <video src={aiSourceVideo} controls style={{ maxWidth: "200px", marginTop: "8px" }} />
          <br />
          <button
            onClick={() => setAiSourceVideo(null)}
            style={{ marginTop: "8px", background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}
          >
            Ye video hata dein
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: "16px" }}>
          <label>Video file</label>
          <br />
          <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label>Aspect Ratio</label>
        <br />
        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} style={{ width: "100%", padding: "8px" }}>
          {ASPECT_RATIOS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

           <div style={{ marginBottom: "16px" }}>
        <label>Platforms (intent only — sirf YouTube abhi actually publish hota hai)</label>
        <br />
        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", marginBottom: "6px", cursor: "pointer", color: "#a78bfa", fontWeight: "bold", fontSize: "13px" }}>
          <input
            type="checkbox"
            checked={platforms.length === PLATFORMS.length}
            onChange={() =>
              setPlatforms(
                platforms.length === PLATFORMS.length ? [] : PLATFORMS.map((p) => p.id)
              )
            }
          />
          Select All (9:16 ratio same hai sab platforms ke liye)
        </label>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "6px" }}>
          {PLATFORMS.map((p) => (
            <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "4px", background: platforms.includes(p.id) ? "#312e81" : "#222", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={platforms.includes(p.id)} onChange={() => togglePlatform(p.id)} />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label>
          <input type="checkbox" checked={addIntro} onChange={(e) => setAddIntro(e.target.checked)} /> Intro add karein
        </label>
      </div>

      {addIntro && (
        <div style={{ marginBottom: "16px" }}>
          <label>Category</label>
          <br />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: "8px" }}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      <hr style={{ margin: "24px 0", borderColor: "#333" }} />
      <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>Option A — Manual</h2>

      <div style={{ marginBottom: "16px" }}>
        <label>Language (intro ke liye)</label>
        <br />
        <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "100%", padding: "8px" }}>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label>Start second (kahan se trim shuru ho)</label>
        <br />
        <input type="number" value={startSeconds} onChange={(e) => setStartSeconds(Number(e.target.value))} style={{ width: "100%", padding: "8px" }} />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label>Max duration (seconds, max 60)</label>
        <br />
        <input type="number" value={maxDuration} onChange={(e) => setMaxDuration(Number(e.target.value))} style={{ width: "100%", padding: "8px" }} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ padding: "12px 24px", background: "#6d28d9", color: "white", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? "Ban raha hai..." : "Short banayein (manual)"}
      </button>

      {error && <p style={{ color: "red", marginTop: "16px" }}>{error}</p>}

      {resultVideo && (
        <div style={{ marginTop: "24px" }}>
          <video src={resultVideo} controls style={{ maxWidth: "300px" }} />
          <br />
          <a href={resultVideo} download="short.mp4">Download</a>
        </div>
      )}

      <hr style={{ margin: "24px 0", borderColor: "#333" }} />
      <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>Option B — AI Auto Short</h2>
      <p style={{ color: "#888", marginBottom: "16px" }}>
        AI khud video sunega, best moments dhoondega, aur Shorts bana dega.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <label>Kitne Shorts banane hain? (1-5)</label>
        <br />
        <select value={numShorts} onChange={(e) => setNumShorts(Number(e.target.value))} style={{ width: "100%", padding: "8px" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleAutoShort}
        disabled={autoLoading}
        style={{ padding: "12px 24px", background: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: autoLoading ? "not-allowed" : "pointer" }}
      >
        {autoLoading ? "AI analyze kar raha hai..." : `🤖 AI Auto Short${numShorts > 1 ? "s" : ""} (${numShorts})`}
      </button>

      {autoError && <p style={{ color: "red", marginTop: "16px" }}>{autoError}</p>}

      {autoResults.length > 0 && (
        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {autoResults.map((r, i) => (
            <div key={i} style={{ padding: "16px", border: "1px solid #444", borderRadius: "8px" }}>
              <h3>Short #{i + 1}</h3>
              <p>Duration: {r.duration?.toFixed(1)}s ({r.start_time?.toFixed(1)}s → {r.end_time?.toFixed(1)}s)</p>
              <p>Score: {r.score}/100</p>
              <p>Reason: {r.reason}</p>
              <video src={r.video} controls style={{ maxWidth: "300px" }} />
              <br />
              <a href={r.video} download={`auto_short_${i + 1}.mp4`}>Download</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}