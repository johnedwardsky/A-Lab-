import sys
import json
import os

sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")

# Force the user index 1 in the URL
from notebooklm_mcp.api_client import NotebookLMClient

class NotebookLMClientU1(NotebookLMClient):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Update URL to include /u/1/
        self.BATCHEXECUTE_URL = "https://notebooklm.google.com/u/1/_/LabsTailwindUi/data/batchexecute"

def verify_u1():
    with open("/Users/johnsky/.notebooklm-mcp/auth.json", "r") as f:
        auth = json.load(f)
    
    client = NotebookLMClientU1(
        cookies=auth["cookies"],
        csrf_token=auth["csrf_token"],
        session_id=auth["session_id"]
    )
    client._PAGE_FETCH_HEADERS["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"

    print("Testing connection with Account Index /u/1/...")
    try:
        notebooks = client.list_notebooks()
        if notebooks:
            print(f"BINGO! Found {len(notebooks)} notebooks in /u/1/")
            for nb in notebooks[:5]:
                print(f"- {nb.title} (ID: {nb.id})")
        else:
            print("Still 0 notebooks in /u/1/. Trying /u/0/ variant...")
            client.BATCHEXECUTE_URL = "https://notebooklm.google.com/u/0/_/LabsTailwindUi/data/batchexecute"
            notebooks = client.list_notebooks()
            if notebooks:
                print(f"BINGO! Found {len(notebooks)} notebooks in /u/0/")
            else:
                print("No notebooks found in either index. Connection is active, but visibility is limited.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_u1()
