"use client";

import { useState, useEffect } from "react";

interface ScheduledItem {
  id: string;
  title: string;
  type: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  videoUrl?: string;
  error: string | null;
}

export default function SchedulerPage() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>("");

  async function loadItems() {
    try {
      const res = await fetch("/api/scheduler");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error("Failed to load schedule:", e);
    } finally {
      setLoading(false);
    }
  }

  async function runCheck() {
    setChecking(true);
    try {
      await fetch("/api/scheduler/check", { method: "POST" });
      setLastChecked(new Date().toLocaleTimeString());
      await loadItems();
    } catch (e) {
      console.error("Check failed:", e);
    } finally {
      setChecking(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Ye scheduled post delete kar dein?")) return;
    await fetch(`/api/scheduler?id=${id}`, { method: "DELETE" });
    await loadItems();
  }

  useEffect(() => {
    loadItems();
    runCheck(); // check immediately on page load
    const interval = setInterval(runCheck, 30000); // then every 30 seconds
    return () => clearInterval(interval);
  }, []);

  function statusColor(status: string) {
    if (status === "published") return "#059669";
    if (status === "failed") return "#dc2626";
    return "#6d28d9";
  }

  const pending = items.filter((i) => i.status === "pending").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const done = items.filter((i) => i.status !== "pending").sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

  return (
    <div style={{ padding: "24px", maxWidth: "800px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
        Scheduler
      </h1>
      <p style={{ color: "#888", marginBottom: "8px" }}>
        Scheduled posts ki list — koi bhi date/time set kar sakte hain (aaj se 30+ din tak).
      </p>
      <p style={{ color: "#555", fontSize: "12px", marginBottom: "24px" }}>
        {checking ? "⏳ Checking..." : lastChecked ? `Last checked: ${lastChecked}` : ""} — Ye page khula rakhna zaroori hai taake scheduled posts publish hon (har 30 second check hota hai).
      </p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>Pending ({pending.length})</h2>
          {pending.length === 0 && <p style={{ color: "#666", marginBottom: "24px" }}>Koi pending schedule nahi hai.</p>}
          {pending.map((item) => (
            <div key={item.id} style={{ padding: "12px 16px", border: "1px solid #333", borderRadius: "8px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{item.title}</strong> <span style={{ color: "#888", fontSize: "12px" }}>({item.type === "short" ? "Short" : "Long Video"})</span>
                <br />
                <span style={{ color: statusColor(item.status), fontSize: "13px" }}>
                  📅 {new Date(item.scheduledAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                style={{ background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          ))}

          <h2 style={{ fontSize: "18px", margin: "24px 0 12px" }}>History ({done.length})</h2>
          {done.length === 0 && <p style={{ color: "#666" }}>Abhi koi publish nahi hui.</p>}
          {done.map((item) => (
            <div key={item.id} style={{ padding: "12px 16px", border: "1px solid #333", borderRadius: "8px", marginBottom: "10px" }}>
              <strong>{item.title}</strong> <span style={{ color: "#888", fontSize: "12px" }}>({item.type === "short" ? "Short" : "Long Video"})</span>
              <br />
              <span style={{ color: statusColor(item.status), fontSize: "13px" }}>
                {item.status === "published" ? "✅ Published" : "❌ Failed"}
                {item.publishedAt && ` — ${new Date(item.publishedAt).toLocaleString()}`}
              </span>
              {item.videoUrl && (
                <>
                  <br />
                  <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#a78bfa", fontSize: "13px" }}>
                    View on YouTube ↗
                  </a>
                </>
              )}
              {item.error && <p style={{ color: "#f87171", fontSize: "12px" }}>{item.error}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}