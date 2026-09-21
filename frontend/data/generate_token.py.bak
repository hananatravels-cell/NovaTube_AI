from google_auth_oauthlib.flow import InstalledAppFlow
import json
import sys

CLIENT_ID = "126832539191-ntger6n9e6tlff5tdmb5upq3ieket1p7.apps.googleusercontent.com"
CLIENT_SECRET = "PLACEHOLDER_SECRET_REMOVED"

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost"]
    }
}

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

channel_name = sys.argv[1] if len(sys.argv) > 1 else "default"
output_filename = f"youtube_token_{channel_name}.json"

flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
creds = flow.run_local_server(port=8080, open_browser=False)

output = {
    "token": creds.token,
    "refresh_token": creds.refresh_token,
    "token_uri": creds.token_uri,
    "client_id": creds.client_id,
    "client_secret": creds.client_secret,
    "scopes": creds.scopes,
    "universe_domain": "googleapis.com",
    "account": "",
    "expiry": creds.expiry.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
}

with open(output_filename, "w") as f:
    json.dump(output, f)

print(f"DONE! File saved as {output_filename}")
print(json.dumps(output, indent=2))
