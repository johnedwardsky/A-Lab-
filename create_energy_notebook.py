import sys
import json
import os

# Set library path
sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")
os.environ["NOTEBOOKLM_BL"] = "boq_labs-tailwind-frontend_20260224.20_p0"

from notebooklm_mcp.api_client import NotebookLMClient
from notebooklm_mcp.auth import load_cached_tokens

def create_and_populate():
    cached = load_cached_tokens()
    if not cached:
        print("Error: No cached tokens found.")
        return

    client = NotebookLMClient(
        cookies=cached.cookies,
        csrf_token=cached.csrf_token,
        session_id=cached.session_id,
    )
    
    # Matching the browser user-agent and settings
    client._PAGE_FETCH_HEADERS["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"

    title = "Тренды мировой энергетики 2026"
    print(f"Creating notebook: {title}...")
    nb = client.create_notebook(title)
    
    if not nb:
        print("Failed to create notebook.")
        return

    print(f"Notebook created! ID: {nb.id}")
    
    content = """Основные тезисы глобальных энергетических трендов на 2026 год:

1. Устойчивый профицит СПГ: Рост мощностей в полтора раза к 2026-2030 годам приведет к избытку предложения и снижению цен.
2. Регионализация рынков: Усиление замкнутых систем и независимых цепочек поставок, особенно в странах под санкциями.
3. Переоценка рисков минералов: Диверсификация поставок лития и редкоземельных металлов, развитие натрий-ионных аккумуляторов.
4. Прорыв в геотермальной энергии: Коммерциализация систем EGS и AGS к 2026 году, использование ИИ для бурения.
5. Переориентация ВИЭ в Китае: Масштабное производство зеленого водорода (65% глобальной мощности электролизеров) для балансировки сети.
6. Рост спроса на электроэнергию: Увеличение на 3.6% ежегодно из-за дата-центров и электрификации.
7. Системы накопления энергии: Переход к длительному хранению (10-100 часов) и новым типам аккумуляторов.
8. Возврат традиционной генерации: Газовая и атомная энергетика остаются критическими для устойчивости энергосистем.

Инвестиции в энергопереход достигли $2.3 трлн, но для целей Net Zero требуется более $5 трлн ежегодно."""

    print("Adding initial source...")
    src = client.add_text_source(nb.id, content, "Ключевые тезисы 2026")
    
    if src:
        print(f"Source added: {src.get('title')} (ID: {src.get('id')})")
        print(f"Success! URL: https://notebooklm.google.com/notebook/{nb.id}")
    else:
        print("Failed to add source.")

if __name__ == "__main__":
    create_and_populate()
