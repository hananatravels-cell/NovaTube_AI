import argparse
import json
import os
from dotenv import load_dotenv

load_dotenv()

from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_CONFIG = {
    "installed": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost"],
    }
}
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

parser = argparse.ArgumentParser()
parser.add_argument("--account", required=True)
parser.add_argument("--port", type=int, default=8765)
args = parser.parse_args()

flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
creds = flow.run_local_server(port=args.port, open_browser=False)

token_path = f"youtube_token_{args.account}.json"
with open(token_path, "w") as f:
    f.write(creds.to_json())

print(f"DONE! Saved to {token_path}")
