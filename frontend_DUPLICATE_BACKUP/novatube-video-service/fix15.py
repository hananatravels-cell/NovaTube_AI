import io
path = "video_service.py"
content = io.open(path, encoding="utf-8").read()

old1 = "        target_w, target_h = (1080, 1920) if req.orientation == \"vertical\" else (1920, 1080)"
new1 = "        target_w, target_h = (540, 960) if req.orientation == \"vertical\" else (960, 540)"
assert old1 in content, "OLD1 NOT FOUND"
content = content.replace(old1, new1, 1)

old2 = """        final_video.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            preset="ultrafast",
            threads=4,
            logger=None,
        )"""
new2 = """        try:
            final_video.write_videofile(
                output_path,
                fps=20,
                codec="libx264",
                audio_codec="aac",
                preset="ultrafast",
                threads=1,
                logger=None,
                bitrate="800k",
            )
        except Exception as e:
            import traceback
            logger.error(f"write_videofile crashed: {e}")
            logger.error(traceback.format_exc())
            raise"""
assert old2 in content, "OLD2 NOT FOUND"
content = content.replace(old2, new2, 1)

io.open(path, "w", encoding="utf-8").write(content)
print("DONE")