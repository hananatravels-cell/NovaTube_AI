from google_auth_oauthlib.flow import InstalledAppFlow
import json

CLIENT_ID = "126832539191-ntger6n9e6tlff5tdmb5upq3ieket1p7.apps.googleusercontent.com"
CLIENT_SECRET = "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"

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

flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
creds = flow.run_local_server(port=0)

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

with open("youtube_token_hanana.json", "w") as f:
    json.dump(output, f)

print("DONE! File saved as youtube_token_hanana.json")
print(json.dumps(output, indent=2))