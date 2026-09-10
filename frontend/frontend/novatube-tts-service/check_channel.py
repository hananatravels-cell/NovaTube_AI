from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

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

SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]

flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
creds = flow.run_local_server(port=0)

youtube = build("youtube", "v3", credentials=creds)
response = youtube.channels().list(part="snippet,statistics", mine=True).execute()

for item in response.get("items", []):
    print("\n\n=== CHANNEL FOUND ===")
    print("Name:", item["snippet"]["title"])
    print("Subscribers:", item["statistics"].get("subscriberCount"))
    print("Channel ID:", item["id"])