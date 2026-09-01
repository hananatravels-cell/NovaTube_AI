import io
path = "frontend/app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()
old = """                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-3">Platforms</label>"""
new = """                  </div>
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
                  <label className="block text-sm font-semibold text-white/70 mb-3">Platforms</label>"""
assert old in content, "OLD BLOCK NOT FOUND"
content = content.replace(old, new)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")