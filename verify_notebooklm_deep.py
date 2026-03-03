import sys
import json
import os

sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")
os.environ["NOTEBOOKLM_BL"] = "boq_labs-tailwind-frontend_20260224.20_p0"

from notebooklm_mcp.api_client import NotebookLMClient, RPC_NAMES

def verify_full():
    with open("/Users/johnsky/.notebooklm-mcp/auth.json", "r") as f:
        auth = json.load(f)
    
    client = NotebookLMClient(
        cookies=auth["cookies"],
        csrf_token=auth["csrf_token"],
        session_id=auth["session_id"]
    )
    client._PAGE_FETCH_HEADERS["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"

    print("Checking RPC protocols...")
    try:
        # Try a different variant of list_notebooks params if 0 was returned
        # Some versions use [null, 1, null, [1]] for owned or [null, 1, null, [2,1]] for all
        params_variants = [
            [None, 1, None, [2]], 
            [None, 1, None, [1]],
            [None, 1, None, [2, 1]]
        ]
        
        for p in params_variants:
            print(f"Testing params: {p}")
            res = client._call_rpc("wXbhsf", p)
            if res and isinstance(res, list):
                print(f"-> Found {len(res)} items")
                for item in res[:3]:
                    # Extract title from item structure (usually at index 1 or inside nested list)
                    print(f"   Item: {str(item)[:100]}")
            else:
                print("-> No items found with these params")

    except Exception as e:
        print(f"Detailed Error: {e}")

if __name__ == "__main__":
    verify_full()
