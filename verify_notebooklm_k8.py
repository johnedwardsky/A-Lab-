import sys
import json
import os

sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")
os.environ["NOTEBOOKLM_BL"] = "boq_labs-tailwind-frontend_20260224.20_p0"

from notebooklm_mcp.api_client import NotebookLMClient

def verify_k8():
    with open("/Users/johnsky/.notebooklm-mcp/auth.json", "r") as f:
        auth = json.load(f)
    
    # Update with the absolute freshest tokens from the last subagent run
    cookies = auth["cookies"]
    # Update cookies with the newest SIDCC and session flags if they changed
    cookies["SIDCC"] = "AKEyXzV7d5vvGszaDSX-ShBAW80hnQipCCr6ambX4e_JTQA_zzbNC6b0r5zDFUdzTFoKccFA"
    
    client = NotebookLMClient(
        cookies=cookies,
        csrf_token="AIXQIkZG48o-WGetZ85B1o7bRSg4:1772054430236",
        session_id="1276975487212821000"
    )
    client._PAGE_FETCH_HEADERS["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"

    notebook_id = "7613e6f6-6a9d-48c8-a048-67b469ae28fa"
    print(f"Direct check for notebook 'К8' (ID: {notebook_id})...")
    
    try:
        # RPC ID for get_notebook is rLM1Ne
        # Params: [notebook_id, [some_flag]]
        res = client._call_rpc("rLM1Ne", [notebook_id, [1]])
        if res:
            print("SUCCESS! Notebook data retrieved.")
            print(f"Title structure: {str(res)[:200]}...")
            
            # Save the successful auth state definitively
            with open("/Users/johnsky/.notebooklm-mcp/auth.json", "w") as f:
                json.dump({
                    "cookies": cookies,
                    "csrf_token": client.csrf_token,
                    "session_id": client._session_id,
                    "extracted_at": 1772054700
                }, f, indent=2)
            print("Verified auth saved to ~/.notebooklm-mcp/auth.json")
        else:
            print("Failed: Notebook not found or access denied (with valid auth).")

    except Exception as e:
        print(f"RPC Error: {e}")

if __name__ == "__main__":
    verify_k8()
