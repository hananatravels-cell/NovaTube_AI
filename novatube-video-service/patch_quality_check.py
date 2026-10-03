import re

path = "/home/ubuntu/NovaTube_AI/novatube-video-service/video_service.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# --- Patch 1: add attempt counter to function signature ---
old1 = "def _run_generate_video(job_id: str, req: VideoRequest):"
new1 = "def _run_generate_video(job_id: str, req: VideoRequest, attempt: int = 1):"

assert old1 in content, "Patch 1 anchor not found!"
assert content.count(old1) == 1, "Patch 1 anchor not unique!"
content = content.replace(old1, new1, 1)

# --- Patch 2: insert quality check block before status="done" ---
old2 = '''        final_video.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            preset="ultrafast",
            threads=4,
            logger=JobProgressLogger(job_id, "encoding_final"),
        )

        _job_update(
            job_id,
            status="done",
            stage="done",
            video_path=output_path,
            work_dir=work_dir,
            duration=final_video.duration,
            music_used=music_used,
        )'''

new2 = '''        final_video.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            preset="ultrafast",
            threads=4,
            logger=JobProgressLogger(job_id, "encoding_final"),
        )

        # ==========================================
        # AI AUTO-QUALITY CHECK + RETRY
        # ==========================================
        MAX_RENDER_ATTEMPTS = 2
        quality_issues = []

        file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
        if file_size < 10000:
            quality_issues.append(f"file size too small ({file_size} bytes)")

        has_audio = False
        actual_duration = 0.0
        if file_size > 0:
            try:
                probe = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type:format=duration",
                     "-of", "json", output_path],
                    capture_output=True, text=True, timeout=20,
                )
                probe_data = json.loads(probe.stdout or "{}")
                has_audio = any(s.get("codec_type") == "audio" for s in probe_data.get("streams", []))
                actual_duration = float(probe_data.get("format", {}).get("duration", 0) or 0)
            except Exception as probe_err:
                logger.warning(f"Quality check ffprobe failed: {probe_err}")

        if not has_audio:
            quality_issues.append("no audio track detected")

        expected_duration = narration.duration if narration else 0
        if expected_duration > 0 and actual_duration > 0:
            if abs(actual_duration - expected_duration) > max(5, expected_duration * 0.25):
                quality_issues.append(
                    f"duration mismatch (expected ~{expected_duration:.0f}s, got {actual_duration:.0f}s)"
                )

        if quality_issues:
            logger.error(f"Quality check FAILED for job {job_id} (attempt {attempt}): {', '.join(quality_issues)}")
            try:
                if os.path.exists(output_path):
                    os.remove(output_path)
            except Exception:
                pass
            safe_close(*open_clips)
            shutil.rmtree(work_dir, ignore_errors=True)

            if attempt < MAX_RENDER_ATTEMPTS:
                logger.info(f"Retrying render for job {job_id} (attempt {attempt + 1}/{MAX_RENDER_ATTEMPTS})")
                _run_generate_video(job_id, req, attempt=attempt + 1)
            else:
                _job_update(
                    job_id,
                    status="failed",
                    error=f"Quality check failed after {MAX_RENDER_ATTEMPTS} attempts: {', '.join(quality_issues)}",
                )
            return
        # ==========================================

        _job_update(
            job_id,
            status="done",
            stage="done",
            video_path=output_path,
            work_dir=work_dir,
            duration=final_video.duration,
            music_used=music_used,
        )'''

assert old2 in content, "Patch 2 anchor not found!"
assert content.count(old2) == 1, "Patch 2 anchor not unique!"
content = content.replace(old2, new2, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Both patches applied successfully!")
