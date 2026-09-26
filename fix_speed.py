filename = 'novatube-video-service/video_service.py'
with open(filename, 'r') as f:
    content = f.read()

start_marker = 'def reformat_video('
start_idx = content.find(start_marker)

if start_idx == -1:
    print("ERROR: Function not found!")
else:
    # Find the next function start
    first_line_end = content.find('\n', start_idx)
    end_idx = content.find('\ndef ', first_line_end + 1)
    if end_idx == -1:
        end_idx = len(content)

    new_func = '''def reformat_video(input_path: str, output_path: str, target_w: int, target_h: int):
    """Resize + center-crop using fast FFmpeg (100x faster than MoviePy)."""
    import subprocess
    subprocess.run([
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h}",
        "-c:v", "libx264",
        "-crf", "23",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-movflags", "+faststart",
        output_path
    ], check=True, capture_output=True)

'''
    new_content = content[:start_idx] + new_func + content[end_idx:]
    with open(filename, 'w') as f:
        f.write(new_content)
    print("SUCCESS: MoviePy replaced with FFmpeg!")
