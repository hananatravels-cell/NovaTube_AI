"""
NovaTube AI - YouTube Upload Automation (multi-account)
Authorizes once per channel/account via OAuth (opens a browser, you
approve access with the relevant YouTube Google account), saves a
reusable per-account token, then uploads videos to that channel —
optionally scheduled for a future publish time.

Each channel is identified by an --account name (any short label you
choose, e.g. "hananatravels", "truecrime", "wealthnova"). Every account
gets its own token file (youtube_token_<account>.json) in this folder,
so you can hold multiple channels' credentials side by side and pick
which one to upload to on each call.

BEFORE AUTHORIZING A NEW ACCOUNT:
    The Google account you're about to authorize with MUST be added as
    a Test user first: Google Cloud Console -> APIs & Services -> OAuth
    consent screen -> Audience -> Test users -> Add users. Without this,
    the browser login will fail with an "access blocked" error.

FIRST-TIME SETUP (once, for the whole script):
    pip install google-auth-oauthlib google-api-python-client --break-system-packages

AUTHORIZING A CHANNEL (one-time per channel):
    python youtube_upload.py --authorize --account truecrime
    -> Opens your browser. Log in with the Google account for that
       specific channel (must already be added as a Test user) and
       click Allow.
    -> Saves youtube_token_truecrime.json in this folder. Future
       uploads for that account use this automatically.

    Repeat with a different --account name for each additional channel,
    e.g.:
        python youtube_upload.py --authorize --account wealthnova
        python youtube_upload.py --authorize --account hananatravels

UPLOADING A VIDEO (from other code, or command line):
    python youtube_upload.py --account truecrime --file "path\\to\\video.mp4" \\
        --title "My Video" --description "Video description" \\
        --tags "tag1,tag2,tag3" --publish-at "2026-08-26T15:00:00Z"

    Omit --account to use "default" (kept for backward compatibility
    with the original single-account token file, youtube_token.json).
    Omit --publish-at to upload as private immediately (you can publish
    manually later), or pass --privacy public / --privacy unlisted for
    an immediate, non-scheduled upload.
"""
import argparse
import os
from dotenv import load_dotenv

load_dotenv()

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# ---------------------------------------------------------------------------
# OAuth client details (from Google Cloud Console -> APIs & Services ->
# Credentials -> Desktop app client "NovaTube AI"). This ONE client is
# shared across all channels/accounts — what's per-account is the saved
# token file, not this client config.
# ---------------------------------------------------------------------------
CLIENT_CONFIG = {
    "installed": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost"],
    }
}

# Only need permission to upload/manage videos, nothing broader.
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

TOKEN_DIR = os.path.dirname(os.path.abspath(__file__))


def _token_path(account: str) -> str:
    """Path to the saved token file for a given account label.
    "default" keeps the original filename (youtube_token.json) so any
    already-authorized single-account setup keeps working unchanged."""
    if account == "default":
        return os.path.join(TOKEN_DIR, "youtube_token.json")
    return os.path.join(TOKEN_DIR, f"youtube_token_{account}.json")


def get_authenticated_service(account: str = "default"):
    """Returns an authorized YouTube API client for the given account
    label, refreshing or creating that account's saved token as needed.
    Prompts an interactive browser login only the very first time for
    that account (or if its saved token is revoked/expired beyond
    refresh). Different accounts never share or overwrite each other's
    token file."""
    token_path = _token_path(account)
    creds = None

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(token_path, "w") as f:
            f.write(creds.to_json())

    return build("youtube", "v3", credentials=creds)


def upload_video(
    file_path: str,
    title: str,
    description: str = "",
    tags: list[str] | None = None,
    category_id: str = "22",  # "People & Blogs" - safe default
    privacy_status: str = "private",
    publish_at: str | None = None,
    account: str = "default",
) -> dict:
    """Uploads a video file to the authorized YouTube channel for the
    given account label.

    account: which channel's saved credentials to use (see module
        docstring). Defaults to "default" for backward compatibility.
    privacy_status: "private", "unlisted", or "public".
    publish_at: ISO 8601 UTC timestamp (e.g. "2026-08-26T15:00:00Z") to
        schedule a future publish time. When set, privacy_status is forced
        to "private" (required by the API for scheduled uploads) and
        YouTube automatically flips it to public at that time.

    Returns the API response dict, which includes the new video's "id".
    """
    youtube = get_authenticated_service(account)

    status = {"privacyStatus": privacy_status, "selfDeclaredMadeForKids": False}
    if publish_at:
        status["privacyStatus"] = "private"
        status["publishAt"] = publish_at

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags or [],
            "categoryId": category_id,
        },
        "status": status,
    }

    media = MediaFileUpload(file_path, chunksize=-1, resumable=True, mimetype="video/mp4")

    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status_progress, response = request.next_chunk()
        if status_progress:
            print(f"Uploading... {int(status_progress.progress() * 100)}%")

    print(f"Upload complete. Video ID: {response['id']} (account: {account})")
    return response


def upload_thumbnail(video_id: str, thumbnail_path: str, account: str = "default"):
    """Sets a custom thumbnail for an already-uploaded video, on the
    given account's channel."""
    youtube = get_authenticated_service(account)
    youtube.thumbnails().set(
        videoId=video_id, media_body=MediaFileUpload(thumbnail_path)
    ).execute()
    print(f"Thumbnail set for video {video_id} (account: {account})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NovaTube AI YouTube uploader (multi-account)")
    parser.add_argument("--account", default="default", help="Account/channel label — determines which saved token file is used (e.g. truecrime, wealthnova). Defaults to 'default'.")
    parser.add_argument("--authorize", action="store_true", help="Run one-time OAuth authorization only, for the given --account")
    parser.add_argument("--file", help="Path to the video file to upload")
    parser.add_argument("--title", help="Video title")
    parser.add_argument("--description", default="", help="Video description")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--privacy", default="private", choices=["private", "unlisted", "public"])
    parser.add_argument("--publish-at", default=None, help="ISO 8601 UTC time to schedule publish, e.g. 2026-08-26T15:00:00Z")
    parser.add_argument("--thumbnail", default=None, help="Optional path to a thumbnail image to set after upload")

    args = parser.parse_args()

    if args.authorize:
        get_authenticated_service(args.account)
        print(f"Authorization complete for account '{args.account}'. Token saved to {_token_path(args.account)}")
    elif args.file and args.title:
        tag_list = [t.strip() for t in args.tags.split(",") if t.strip()]
        result = upload_video(
            file_path=args.file,
            title=args.title,
            description=args.description,
            tags=tag_list,
            privacy_status=args.privacy,
            publish_at=args.publish_at,
            account=args.account,
        )
        if args.thumbnail:
            upload_thumbnail(result["id"], args.thumbnail, account=args.account)
    else:
        parser.print_help()