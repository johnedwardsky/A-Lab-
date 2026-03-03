import sys
import json
import os

# Path to the notebooklm-mcp-server
sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")

try:
    from notebooklm_mcp.api_client import NotebookLMClient
    from notebooklm_mcp.auth import load_cached_tokens
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def main():
    cached = load_cached_tokens()
    if not cached:
        print("Error: No cached tokens. Please login first.")
        return

    client = NotebookLMClient(
        cookies=cached.cookies,
        csrf_token=cached.csrf_token,
        session_id=cached.session_id,
    )

    try:
        notebooks = client.list_notebooks()
        print("Available Notebooks:")
        for nb in notebooks:
            print(f"- {nb.title} (ID: {nb.id})")
        
        # We'll use the first notebook or a generic one if possible
        if not notebooks:
            print("No notebooks found.")
            return
            
        target_nb = notebooks[0]
        print(f"\nQuerying Notebook: {target_nb.title}")
        
        prompt = "Как начать создавать свою нейронную сеть? Что для этого нужно (знания, инструменты, этапы)? Ответь подробно на русском языке."
        result = client.query(target_nb.id, prompt)
        
        print("\n----- RESPONSE FROM NOTEBOOKLM -----")
        print(result.text if hasattr(result, 'text') else result)
        
    except Exception as e:
        print(f"Error during query: {e}")

if __name__ == "__main__":
    main()
