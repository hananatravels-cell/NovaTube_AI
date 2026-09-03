'use client';

import { useEffect, useState } from 'react';

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

export default function StatusPage() {
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function runCheck() {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setResults(data.results);
      setCheckedAt(data.checkedAt);
    } catch (e) {
      setResults([{ name: 'Status check', ok: false, detail: 'Failed to reach /api/status' }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20, fontFamily: 'sans-serif', color: '#eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22 }}>Platform Status</h1>
        <button
          onClick={runCheck}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid #444',
            background: '#222',
            color: '#eee',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Checking...' : 'Recheck'}
        </button>
      </div>

      {checkedAt && (
        <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
          Last checked: {new Date(checkedAt).toLocaleString()}
        </p>
      )}

      {!results && <p>Checking all services...</p>}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((r) => (
            <div
              key={r.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: 8,
                background: r.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${r.ok ? '#22c55e' : '#ef4444'}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{r.detail}</div>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: r.ok ? '#22c55e' : '#ef4444',
                  fontSize: 14,
                }}
              >
                {r.ok ? '✅ OK' : '❌ NOT OK'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}