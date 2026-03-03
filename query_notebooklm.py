import sys
import json
sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")
from notebooklm_mcp.api_client import NotebookLMClient
from notebooklm_mcp.auth import load_cached_tokens

def main():
    cached = load_cached_tokens()
    if not cached:
        print("Error: No cached tokens.")
        return

    client = NotebookLMClient(
        cookies=cached.cookies,
        csrf_token=cached.csrf_token,
        session_id=cached.session_id,
    )

    notebooks = client.list_notebooks()
    target_nb = next((nb for nb in notebooks if nb.title == "Тренды AI 2026"), None)
    
    if not target_nb:
        try:
             target_nb = notebooks[0]
             print(f"Notebook 'Тренды AI 2026' not found. Using first notebook: {target_nb.title}")
        except:
             print("No notebooks found.")
             return
             
    print(f"Target Notebook: {target_nb.title} ({target_nb.id})")
    
    # Check sources
    sources = client.get_notebook_sources_with_types(target_nb.id)
    print(f"Found {len(sources)} sources.")
    for s in sources:
        print(f"- {s.get('title', 'Unknown source')}")

    print("\nQuerying Notebook LM...")
    # Instruct Notebook LM to write the HTML page
    prompt = "Напиши подробный прогноз об AI на 2026 год на основе загруженных документов. Сделай его в виде красивой, готовой HTML страницы с современным дизайном, как статья для сайта. Используй CSS (без внешних библиотек) внутри тега <style>, добавь заголовки, параграфы, и структурированные данные. Только HTML код, без лишних слов."
    result = client.query(target_nb.id, prompt)
    print("----- RESULT -----")
    print(result.text if hasattr(result, 'text') else result)
    
    with open("notebooklm_draft.html", "w", encoding="utf-8") as f:
        f.write(result.text if hasattr(result, 'text') else str(result))

if __name__ == "__main__":
    main()
