import os
import time
from video_service import build_intro_clip

category = "ai_technology"
audio_path = os.path.join("shorts_intros", category, "intro_ur_audio.mp3")
text = "Aaj hum baat karenge AI aur Technology ki duniya ke baare mein."

print("Building intro clip (no text overlay)...")
t0 = time.time()
clip = build_intro_clip(audio_path, category, "portrait", text)
print(f"Clip built in {time.time()-t0:.1f}s")

print("Writing video file...")
t0 = time.time()
clip.write_videofile(
    r"C:\temp\test_final_notext.mp4", fps=24, codec="libx264",
    audio_codec="aac", preset="ultrafast", threads=2, logger=None,
)
print(f"Done in {time.time()-t0:.1f}s")
print("ALL DONE!")