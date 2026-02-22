import os
import sys
import json
import logging

# Add the library to path
sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")

from notebooklm_mcp.api_client import NotebookLMClient
from notebooklm_mcp.auth import load_cached_tokens

def main():
    cached = load_cached_tokens()
    if not cached:
        print("Error: No cached tokens found.")
        return

    client = NotebookLMClient(
        cookies=cached.cookies,
        csrf_token=cached.csrf_token,
        session_id=cached.session_id,
    )

    # 1. Create or Find Notebook
    notebooks = client.list_notebooks()
    target_nb = next((nb for nb in notebooks if nb.title == "Тренды AI 2026"), None)
    
    if not target_nb:
        print("Creating notebook...")
        target_nb = client.create_notebook(title="Тренды AI 2026")
    
    print(f"Notebook ID: {target_nb.id}")
    
    # 2. Add some content if empty (needed for audio overview)
    sources = client.get_notebook_sources_with_types(target_nb.id)
    if not sources:
        print("Adding content...")
        summary = """
        Top AI Trends 2025-2026 Summary:
        1. Agentic AI: Autonomous agents that can plan and execute multi-step tasks.
        2. AI as Infrastructure: Deep integration into all software.
        3. ROI Focus: Tangible business value over hype.
        4. Energy Efficiency: Green AI and specialized hardware.
        5. Personalization: Smaller, more specialized models for local use.
        """
        client.add_text_source(target_nb.id, text=summary, title="AI Trends Summary")
    
    # 3. Create Audio Overview
    print("Triggering audio overview...")
    sources = client.get_notebook_sources_with_types(target_nb.id)
    source_ids = [s["id"] for s in sources if s.get("id")]
    
    result = client.create_audio_overview(target_nb.id, source_ids=source_ids)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
