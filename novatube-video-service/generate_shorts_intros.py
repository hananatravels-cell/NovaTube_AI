import os
import base64
import requests
from video_service import build_intro_clip

TTS_URL = "https://novatube-ai-1.onrender.com/generate-voice"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "shorts_intros")

# category slug -> {language: intro text}
INTRO_TEXTS = {
    "ai_technology": {
        "Urdu": "Aaj hum baat karenge AI aur Technology ki duniya ke baare mein.",
        "English": "Today we're talking about the world of AI and Technology.",
        "Arabic": "اليوم سنتحدث عن عالم الذكاء الاصطناعي والتكنولوجيا.",
    },
    "islamic_stories": {
        "Urdu": "Aaj hum sunenge ek Islamic story.",
        "English": "Today we're going to hear an Islamic story.",
        "Arabic": "اليوم سنستمع إلى قصة إسلامية.",
    },
    "make_money_online": {
        "Urdu": "Aaj hum baat karenge online paise kamane ke tareeqon ke baare mein.",
        "English": "Today we're talking about ways to make money online.",
        "Arabic": "اليوم سنتحدث عن طرق كسب المال عبر الإنترنت.",
    },
    "personal_finance": {
        "Urdu": "Aaj hum baat karenge paison ki bachat ke baare mein.",
        "English": "Today we're talking about saving and managing your money.",
        "Arabic": "اليوم سنتحدث عن توفير وإدارة المال.",
    },
    "motivation": {
        "Urdu": "Aaj ka yeh video aapko motivate karega.",
        "English": "Today's video is here to motivate you.",
        "Arabic": "سيحفزك فيديو اليوم.",
    },
    "health_fitness": {
        "Urdu": "Aaj hum baat karenge health aur fitness ke baare mein.",
        "English": "Today we're talking about health and fitness.",
        "Arabic": "اليوم سنتحدث عن الصحة واللياقة البدنية.",
    },
    "true_crime": {
        "Urdu": "Aaj hum sunenge ek haqeeqi crime ki kahani.",
        "English": "Today we're hearing a real crime story.",
        "Arabic": "اليوم سنستمع إلى قصة جريمة حقيقية.",
    },
    "history": {
        "Urdu": "Aaj hum baat karenge tareekh ke ek ahem waqia ke baare mein.",
        "English": "Today we're talking about an important moment in history.",
        "Arabic": "اليوم سنتحدث عن حدث تاريخي مهم.",
    },
    "kids_stories": {
        "Urdu": "Aaj hum sunenge bachon ki ek pyari kahani.",
        "English": "Today we're hearing a lovely story for kids.",
        "Arabic": "اليوم سنستمع إلى قصة جميلة للأطفال.",
    },
    "bedtime_stories": {
        "Urdu": "Aaj raat sunte hain ek pyari bedtime story.",
        "English": "Tonight, let's listen to a lovely bedtime story.",
        "Arabic": "الليلة سنستمع إلى قصة جميلة قبل النوم.",
    },
}

LANG_CODE = {"Urdu": "ur", "English": "en", "Arabic": "ar"}


def main():
    for category, lang_texts in INTRO_TEXTS.items():
        out_dir = os.path.join(OUTPUT_DIR, category)
        os.makedirs(out_dir, exist_ok=True)

        for language, text in lang_texts.items():
            code = LANG_CODE[language]
            print(f"Generating {category} intro ({language})...")

            resp = requests.post(
                TTS_URL,
                json={"text": text, "voice": "Aria — Warm & Clear", "language": language},
            )
            resp.raise_for_status()
            audio_b64 = resp.json()["audio"].split(",", 1)[1]

            audio_path = os.path.join(out_dir, f"intro_{code}_audio.mp3")
            with open(audio_path, "wb") as f:
                f.write(base64.b64decode(audio_b64))

            clip = build_intro_clip(audio_path, category, "portrait", text)
            out_path = os.path.join(out_dir, f"intro_{code}.mp4")
            clip.write_videofile(
                out_path, fps=24, codec="libx264", audio_codec="aac",
                preset="ultrafast", threads=4, logger=None,
            )
            print(f"Saved {out_path}")

    print("Done! All shorts intros generated.")


if __name__ == "__main__":
    main()