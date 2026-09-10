import io
path = "novatube-video-service/video_service.py"
content = io.open(path, encoding="utf-8").read()

old1 = """from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    CompositeAudioClip,
    concatenate_videoclips,
    concatenate_audioclips,
)"""
new1 = """from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    CompositeAudioClip,
    ImageClip,
    CompositeVideoClip,
    concatenate_videoclips,
    concatenate_audioclips,
)
from PIL import Image, ImageDraw, ImageFont"""
assert old1 in content, "OLD1 NOT FOUND"
content = content.replace(old1, new1)

old2 = """class VideoRequest(BaseModel):
    scenes: list[str]
    category: str = "storytelling"
    audio_base64: str
    orientation: str = "vertical"
    want_music: bool = True
    title: str = \"\""""
new2 = """class VideoRequest(BaseModel):
    scenes: list[str]
    category: str = "storytelling"
    audio_base64: str
    orientation: str = "vertical"
    want_music: bool = True
    title: str = ""
    intro_audio_base64: str | None = None
    intro_text: str = \"\""""
assert old2 in content, "OLD2 NOT FOUND"
content = content.replace(old2, new2)

old3 = '''def download_clip(url: str, dest_path: str) -> bool:'''
new3 = '''def create_intro_text_image(text: str, width: int, height: int):
    """Build a semi-transparent dark banner with centered white text,
    used as an overlay on top of the intro background clip."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    banner_h = int(height * 0.22)
    banner_y = int((height - banner_h) / 2)
    draw.rectangle([0, banner_y, width, banner_y + banner_h], fill=(0, 0, 0, 140))

    font_size = int(width * 0.06)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    max_text_width = width * 0.85
    words = text.split()
    lines = []
    current = ""
    for w in words:
        test = (current + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_text_width and current:
            lines.append(current)
            current = w
        else:
            current = test
    if current:
        lines.append(current)
    lines = lines[:3]

    line_height = font_size + 10
    total_h = line_height * len(lines)
    start_y = banner_y + (banner_h - total_h) / 2

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        x = (width - line_w) / 2
        y = start_y + i * line_height
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))

    return img


def build_intro_clip(intro_audio_path: str, category: str, orientation: str, intro_text: str):
    """Fetch one category-matched background clip, loop/trim it to match
    the intro narration's length, overlay the topic text on top, and
    attach the intro narration as its audio track."""
    target_w, target_h = (1080, 1920) if orientation == "vertical" else (1920, 1080)

    intro_audio = AudioFileClip(intro_audio_path)
    intro_duration = intro_audio.duration

    query = f"{CATEGORY_KEYWORDS.get(category, CATEGORY_KEYWORDS['storytelling'])} intro opening"
    video_url = search_pexels_video(query, orientation) or search_pixabay_video(query)
    if not video_url:
        raise HTTPException(status_code=500, detail="Could not fetch an intro background clip")

    tmp_dir = tempfile.mkdtemp(prefix="novatube_intro_")
    bg_path = os.path.join(tmp_dir, "intro_bg.mp4")
    if not download_clip(video_url, bg_path):
        raise HTTPException(status_code=500, detail="Failed to download intro background clip")

    bg_clip = VideoFileClip(bg_path)
    if bg_clip.duration < intro_duration:
        loops = int(intro_duration // bg_clip.duration) + 1
        bg_clip = concatenate_videoclips([bg_clip] * loops).subclip(0, intro_duration)
    else:
        bg_clip = bg_clip.subclip(0, intro_duration)

    bg_clip = bg_clip.resize(height=target_h) if bg_clip.h < bg_clip.w else bg_clip.resize(width=target_w)
    bg_clip = bg_clip.crop(
        x_center=bg_clip.w / 2, y_center=bg_clip.h / 2, width=target_w, height=target_h
    )

    text_img = create_intro_text_image(intro_text or "", target_w, target_h)
    text_img_path = os.path.join(tmp_dir, "intro_text.png")
    text_img.save(text_img_path)

    text_clip = ImageClip(text_img_path).set_duration(intro_duration)
    intro_composite = CompositeVideoClip([bg_clip, text_clip])
    intro_composite = intro_composite.set_audio(intro_audio)

    return intro_composite


def download_clip(url: str, dest_path: str) -> bool:'''
assert old3 in content, "OLD3 NOT FOUND"
content = content.replace(old3, new3)

old4 = """        final_video = final_video.set_audio(final_audio)

        output_path = os.path.join(work_dir, f"final_{uuid.uuid4().hex}.mp4")"""
new4 = """        final_video = final_video.set_audio(final_audio)

        if req.intro_audio_base64:
            try:
                intro_audio_data = req.intro_audio_base64
                if intro_audio_data.startswith("data:"):
                    intro_audio_data = intro_audio_data.split(",", 1)[1]
                intro_audio_bytes = base64.b64decode(intro_audio_data)
                intro_audio_path = os.path.join(work_dir, "intro_narration.mp3")
                with open(intro_audio_path, "wb") as f:
                    f.write(intro_audio_bytes)

                intro_clip = build_intro_clip(
                    intro_audio_path, req.category, req.orientation, req.intro_text
                )
                final_video = concatenate_videoclips([intro_clip, final_video], method="compose")
                logger.info("Intro clip prepended successfully")
            except Exception as e:
                logger.warning(f"Intro clip failed, continuing without intro: {e}")

        output_path = os.path.join(work_dir, f"final_{uuid.uuid4().hex}.mp4")"""
assert old4 in content, "OLD4 NOT FOUND"
content = content.replace(old4, new4)

io.open(path, "w", encoding="utf-8").write(content)
print("DONE")