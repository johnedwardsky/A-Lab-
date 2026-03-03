import json
import os
import sys
import re

# Add the library to path
sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")
os.environ["NOTEBOOKLM_BL"] = "boq_labs-tailwind-frontend_20260224.20_p0"

from notebooklm_mcp.api_client import NotebookLMClient

def parse_cookies(cookie_str):
    cookies = {}
    for item in cookie_str.split(';'):
        if '=' in item:
            k, v = item.strip().split('=', 1)
            cookies[k] = v
    return cookies

def update_and_test():
    cookie_str = "SEARCH_SAMESITE=CgQI8p8B; __Secure-BUCKET=CEw; SID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxKlPcKpRuaJIdHLRpGnJUXgACgYKAV4SAQ8SFQHGX2MinG-Cv9BEWlalmKzhAKfFoRoVAUF8yKrNUFZVi7byXyvXa6FXnSgy0076; __Secure-1PSID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxmwpgTnkLSEOIRGe126lMKwACgYKASMSAQ8SFQHGX2MinvtClcOASsvu7Rx48mclphoVAUF8yKpGsdLLmyP4cYOP2ZwZMWaX0076; __Secure-3PSID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxPHbgGis0k9o0doplo9b-mwACgYKAe8SAQ8SFQHGX2MigBWiYlEJDcIPI5nFV7J-LRoVAUF8yKo-AKRetksjuRUWp_L3DEsh0076; HSID=AiDyqsbMvbL3lQhsA; SSID=AuJ2Mu2HJ21Xo4Eo9; APISID=d_6c32KCPdNxi5DY/AOflqhvIWKPEk3Uzv; SAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; __Secure-1PAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; __Secure-3PAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; ACCOUNT_CHOOSER=AFx_qI4QDkyoQVz3jfPcTAizfhdh8D_G4fOCmEc6bWianpXyxYFA9oOeqFPe7aoUBUza-GWnr3gHWlsRICVHcgubrVijnaBu_dcCYKFXv9eLuONUbub2tV-0DUZF7kQmjAI7tMZ-2Gdg; __Host-GAPS=1:uIqsIa35PVOIvftZK00M9lmgMabx7EkfiUGCRy5FPl2DuhmjEu8o8GhVeMrA2T9RoGdFoFRtanbTL7RHQZe3V0xnbLq7lQ:t_CcBkyvd_xNOC9j; LSID=o.myaccount.google.com|o.notebooklm.google.com|s.NL|s.RU|s.youtube:g.a0007AiQs8kcl2viekjy7oT340apHDBcMt1RvrCq5nfovqUmTz7jdT98ANh6NxwfjVjSwGQV_gACgYKAYASAQ8SFQHGX2Mio-e9HcEfaBmi1NT2qyb-ChoVAUF8yKo21eJz1XKYfGZZWpwiCANV0076; __Host-1PLSID=o.myaccount.google.com|o.notebooklm.google.com|s.NL|s.RU|s.youtube:g.a0007AiQs8kcl2viekjy7oT340apHDBcMt1RvrCq5nfovqUmTz7jJnh5E7koNpb8aOUWS6YaMwACgYKAToSAQ8SFQHGX2MiN3f4UDOzPFHGyrTB3wPwJBoVAUF8yKpwv3xybPDe2_dxmVd33trO0076; __Host-3PLSID=o.myaccount.google.com|o.notebooklm.google.com|s.NL|s.RU|s.youtube:g.a0007AiQs8kcl2viekjy7oT340apHDBcMt1RvrCq5nfovqUmTz7jymDwoQaYKCWqqZ69qpeuUAACgYKAcgSAQ8SFQHGX2MiDqR3sc_yDcTszN_MciWKFBoVAUF8yKrdVxyRXA2ccwsXkkhhoODi0076; AEC=AaJma5uG2ThtlpIN5I7tW54CXqFVzauV6cIOX3-UCw9soN_OphaBo-Vpa10; LSOLH=_SVI_EPrNtanZ9pIDGAkiP01BRURIZl9xNkRnZzlhN09ydkhqNmJSQXRzR1FNUVVOS0d6NldDN29vcDRSREM0dWplall2d3pxNG15VWZxdw_:29534900:154a; __Secure-1PSIDTS=sidts-CjEBBj1CYi3mRxZ4PUP46fUeX_z_aJrnQEgYoyphuywY7RaGR4qoFfI97OvfJ8F7OS06EAA; __Secure-3PSIDTS=sidts-CjEBBj1CYi3mRxZ4PUP46fUeX_z_aJrnQEgYoyphuywY7RaGR4qoFfI97OvfJ8F7OS06EAA; NID=529=pU7ECeujvXbS8nsGDDwrJtf5XMjQfOiTvNuCR_M1l6BzAsjvAs0t_xhaheEcD9xegnLD7mxz6Cz8-ffmO9D89iU0c5nsycMnYsJGFqeZKJiM7ab6hmtAYqkX2ByZ65OLYxmE-amDXFlvJAZSFkwuBmwMPla-n7PUMdZZyT5CZgqoZJPxv30dDps6JSOuvrBjz4tcvkXYjLnky_D2XWmVLYzIfZDl6JLwJgdVZLWhAZo8rTvv6MVLUa6P77bEoqNpKvYxJl95WxItCkRIVedXnw8IzpsVPmDXS9F6eb_JAemSULug-rbFRDuwXOCwwsJa4IbIh0lRCzx6pLMz_rvCMFJscSrIECgRRydc1Mf4Pke6CKGiyuPor48HPeffQzlaIsFG7KMfoIJgUXCi0nHpH1nmWOTHcyFaNVKvIWOcoulXa2P6IwMgSCU8a6QvkpE3QrnxyB7OQnpEsSRUURbu_CnGazUWOSYi0JiyI02D6cfV6DTt8psCrwLOodVPiDCsHouutOAUBPNt7Ch5WMFBiGKUT-jzpVN_XjAetgnDm2-L7pSThNmWauV8eN2BQm_eNHs_mt-XwZzxHZpTfd2FaoQV1YS0t6J9HLxJmFSleVI6iu-5f97JRUbKbsDpTEGvEJm_TXr1dPIUstflqsfTkLaHNL7aLTaneqQ_0DT-F37nis9oq8Zt9Oi1HOyul344h6ZIwg; __Secure-ENID=31.SE=LlkDZfbziwn6J59H5Xhsa17vhJtaBw-aJQfFalMX8EGOw4jBCcLzu_PYuUW8R2LQUzI1dnnocRYF71XWtVoLgccwCwsoEibZ22vzUUE1BRUxALm2ammUb_F6o9Moy5HxswiWvfGW_bAVFHYU5INKcaPt-lwWgSKlG2YnWS62m-Pw4ZtTlu3I7lPLOsWivQFNg5RwinomfMZgKIMTPFqI1y_YLcCmr5RLZMh9bHL5HWgiws5XSUC-XYfzauwsp3ZkkkANjfqTK6WUrvAYCMpz4Rlla8aaYwI-pWWF_tBZGMW25eUMkqpTgb_JvSUAcJPTHQEABUhFUAyNfx-KRYD4mJg; SIDCC=AKEyXzWn-72-9Od64c2j-YMs57k2Fh7SlWIEl8bOr8kD1B32L3PHg7lE8hRJQEt-6RFMglj2QA; __Secure-1PSIDCC=AKEyXzV3Y_bvzjT9vyRNJAoXquP4zux6eZL9QwkyKMNOFP9XwOH-ciqM2rZjQQrlzXkKxYMtuBY; __Secure-3PSIDCC=AKEyXzV3Y_bvzjT9vyRNJAoXquP4zux6eZL9QwkyKMNOFP9XwOH-ciqM2rZjQQrlzXkKxYMtuBY"
    
    cookies = parse_cookies(cookie_str)
    
    # We still need a CSRF token. Often it can be extracted from the page or is relatively stable if not expired.
    # However, let's try to get a fresh one by simulating a page load if needed.
    # For now, I'll use the last known one or try to find it.
    
    last_auth_path = "/Users/johnsky/.notebooklm-mcp/auth.json"
    csrf_token = None
    session_id = None
    
    if os.path.exists(last_auth_path):
        with open(last_auth_path, "r") as f:
            old_auth = json.load(f)
            csrf_token = old_auth.get("csrf_token")
            session_id = old_auth.get("session_id")

    print(f"Using CSRF: {csrf_token}")
    print(f"Using Session: {session_id}")

    client = NotebookLMClient(cookies=cookies, csrf_token=csrf_token, session_id=session_id)
    client._PAGE_FETCH_HEADERS["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"

    try:
        notebooks = client.list_notebooks()
        print(f"SUCCESS! Found {len(notebooks)} notebooks.")
        
        # Update auth.json
        new_auth = {
            "cookies": cookies,
            "csrf_token": csrf_token,
            "session_id": session_id,
            "updated_at": 1772109843
        }
        with open(last_auth_path, "w") as f:
            json.dump(new_auth, f, indent=2)
            
        # Use first notebook to ask the question
        if notebooks:
            target = notebooks[0]
            print(f"Querying: {target.title}")
            prompt = "Как начать создавать свою нейронную сеть? Что для этого нужно (знания, инструменты, этапы)? Ответь подробно на русском языке."
            result = client.query(target.id, prompt)
            print("\n----- RESPONSE -----\n")
            print(result.text if hasattr(result, 'text') else result)
            
    except Exception as e:
        print(f"Failed: {e}")
        # If it failed due to CSRF, we might need the user to provide it or extract it from a fresh fetch.
        
if __name__ == "__main__":
    update_and_test()
