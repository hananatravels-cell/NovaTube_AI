import io
path = "app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()

# 1. Enable publish stage
old1 = "  { id: 'publish', label: 'Publishing', emoji: '🚀', status: 'waiting', available: false },"
new1 = "  { id: 'publish', label: 'Publishing', emoji: '🚀', status: 'waiting', available: true },"
assert old1 in content, "OLD1 NOT FOUND"
content = content.replace(old1, new1, 1)

# 2. Stop force-failing publish stage at end of run
old2 = """      updateStage('schedule', 'failed');
      updateStage('publish', 'failed');
    } catch (err: any) {"""
new2 = """      updateStage('schedule', 'failed');
    } catch (err: any) {"""
assert old2 in content, "OLD2 NOT FOUND"
content = content.replace(old2, new2, 1)

# 3. Add publish state
old3 = """  const [copiedField, setCopiedField] = useState('');
  const alreadyDownloadedFor = useRef<string>('');"""
new3 = """  const [copiedField, setCopiedField] = useState('');
  const alreadyDownloadedFor = useRef<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [publishError, setPublishError] = useState('');"""
assert old3 in content, "OLD3 NOT FOUND"
content = content.replace(old3, new3, 1)

# 4. Add handlePublish function
old4 = "  function StageIcon({ stage }: { stage: Stage }) {"
new4 = """  async function handlePublish() {
    if (!resultVideo) return;
    setIsPublishing(true);
    setPublishError('');
    setPublishedUrl('');
    updateStage('publish', 'working');
    try {
      const res = await fetch('/api/agent/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64: resultVideo,
          thumbnailBase64: resultThumbnail || undefined,
          title: resultSeo?.title || resultTopic || niche,
          description: resultSeo?.description || '',
          tags: resultSeo?.tags || [],
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

  function StageIcon({ stage }: { stage: Stage }) {"""
assert old4 in content, "OLD4 NOT FOUND"
content = content.replace(old4, new4, 1)

# 5. Add Publish button UI
old5 = """              {!resultVideo && !isRunning && ("""
new5 = """              {resultVideo && (
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
                        <Globe className="w-5 h-5" /> Publish Now (YouTube)
                      </>
                    )}
                  </button>
                  {publishedUrl && (
                    
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

              {!resultVideo && !isRunning && ("""
assert old5 in content, "OLD5 NOT FOUND"
content = content.replace(old5, new5, 1)

io.open(path, "w", encoding="utf-8").write(content)
print("DONE")