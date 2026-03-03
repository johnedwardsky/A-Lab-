import httpx
import re
import json

cookie_str = "SEARCH_SAMESITE=CgQI8p8B; __Secure-BUCKET=CEw; SID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxKlPcKpRuaJIdHLRpGnJUXgACgYKAV4SAQ8SFQHGX2MinG-Cv9BEWlalmKzhAKfFoRoVAUF8yKrNUFZVi7byXyvXa6FXnSgy0076; __Secure-1PSID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxmwpgTnkLSEOIRGe126lMKwACgYKASMSAQ8SFQHGX2MinvtClcOASsvu7Rx48mclphoVAUF8yKpGsdLLmyP4cYOP2ZwZMWaX0076; __Secure-3PSID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxPHbgGis0k9o0doplo9b-mwACgYKAe8SAQ8SFQHGX2MigBWiYlEJDcIPI5nFV7J-LRoVAUF8yKo-AKRetksjuRUWp_L3DEsh0076; HSID=AiDyqsbMvbL3lQhsA; SSID=AuJ2Mu2HJ21Xo4Eo9; APISID=d_6c32KCPdNxi5DY/AOflqhvIWKPEk3Uzv; SAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; __Secure-1PAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; __Secure-3PAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; ACCOUNT_CHOOSER=AFx_qI4QDkyoQVz3jfPcTAizfhdh8D_G4fOCmEc6bWianpXyxYFA9oOeqFPe7aoUBUza-GWnr3gHWlsRICVHcgubrVijnaBu_dcCYKFXv9eLuONUbub2tV-0DUZF7kQmjAI7tMZ-2Gdg; __Host-GAPS=1:uIqsIa35PVOIvftZK00M9lmgMabx7EkfiUGCRy5FPl2DuhmjEu8o8GhVeMrA2T9RoGdFoFRtanbTL7RHQZe3V0xnbLq7lQ:t_CcBkyvd_xNOC9j; LSID=o.myaccount.google.com|o.notebooklm.google.com|s.NL|s.RU|s.youtube:g.a0007AiQs8kcl2viekjy7oT340apHDBcMt1RvrCq5nfovqUmTz7jdT98ANh6NxwfjVjSwGQV_gACgYKAYASAQ8SFQHGX2Mio-e9HcEfaBmi1NT2qyb-ChoVAUF8yKo21eJz1XKYfGZZWpwiCANV0076; __Host-1PLSID=o.myaccount.google.com|o.notebooklm.google.com|s.NL|s.RU|s.youtube:g.a0007AiQs8kcl2viekjy7oT340apHDBcMt1RvrCq5nfovqUmTz7jJnh5E7koNpb8aOUWS6YaMwACgYKAToSAQ8SFQHGX2MiN3f4UDOzPFHGyrTB3wPwJBoVAUF8yKpwv3xybPDe2_dxmVd33trO0076; __Host-3PLSID=o.myaccount.google.com|o.notebooklm.google.com|s.NL|s.RU|s.youtube:g.a0007AiQs8kcl2viekjy7oT340apHDBcMt1RvrCq5nfovqUmTz7jymDwoQaYKCWqqZ69qpeuUAACgYKAcgSAQ8SFQHGX2MiDqR3sc_yDcTszN_MciWKFBoVAUF8yKrdVxyRXA2ccwsXkkhhoODi0076; AEC=AaJma5uG2ThtlpIN5I7tW54CXqFVzauV6cIOX3-UCw9soN_OphaBo-Vpa10; LSOLH=_SVI_EPrNtanZ9pIDGAkiP01BRURIZl9xNkRnZzlhN09ydkhqNmJSQXRzR1FNUVVOS0d6NldDN29vcDRSREM0dWplall2d3pxNG15VWZxdw_:29534900:154a; __Secure-1PSIDTS=sidts-CjEBBj1CYi3mRxZ4PUP46fUeX_z_aJrnQEgYoyphuywY7RaGR4qoFfI97OvfJ8F7OS06EAA; __Secure-3PSIDTS=sidts-CjEBBj1CYi3mRxZ4PUP46fUeX_z_aJrnQEgYoyphuywY7RaGR4qoFfI97OvfJ8F7OS06EAA; NID=529=pU7ECeujvXbS8nsGDDwrJtf5XMjQfOiTvNuCR_M1l6BzAsjvAs0t_xhaheEcD9xegnLD7mxz6Cz8-ffmO9D89iU0c5nsycMnYsJGFqeZKJiM7ab6hmtAYqkX2ByZ65OLYxmE-amDXFlvJAZSFkwuBmwMPla-n7PUMdZZyT5CZgqoZJPxv30dDps6JSOuvrBjz4tcvkXYjLnky_D2XWmVLYzIfZDl6JLwJgdVZLWhAZo8rTvv6MVLUa6P77bEoqNpKvYxJl95WxItCkRIVedXnw8IzpsVPmDXS9F6eb_JAemSULug-rbFRDuwXOCwwsJa4IbIh0lRCzx6pLMz_rvCMFJscSrIECgRRydc1Mf4Pke6CKGiyuPor48HPeffQzlaIsFG7KMfoIJgUXCi0nHpH1nmWOTHcyFaNVKvIWOcoulXa2P6IwMgSCU8a6QvkpE3QrnxyB7OQnpEsSRUURbu_CnGazUWOSYi0JiyI02D6cfV6DTt8psCrwLOodVPiDCsHouutOAUBPNt7Ch5WMFBiGKUT-jzpVN_XjAetgnDm2-L7pSThNmWauV8eN2BQm_eNHs_mt-XwZzxHZpTfd2FaoQV1YS0t6J9HLxJmFSleVI6iu-5f97JRUbKbsDpTEGvEJm_TXr1dPIUstflqsfTkLaHNL7aLTaneqQ_0DT-F37nis9oq8Zt9Oi1HOyul344h6ZIwg; __Secure-ENID=31.SE=LlkDZfbziwn6J59H5Xhsa17vhJtaBw-aJQfFalMX8EGOw4jBCcLzu_PYuUW8R2LQUzI1dnnocRYF71XWtVoLgccwCwsoEibZ22vzUUE1BRUxALm2ammUb_F6o9Moy5HxswiWvfGW_bAVFHYU5INKcaPt-lwWgSKlG2YnWS62m-Pw4ZtTlu3I7lPLOsWivQFNg5RwinomfMZgKIMTPFqI1y_YLcCmr5RLZMh9bHL5HWgiws5XSUC-XYfzauwsp3ZkkkANjfqTK6WUrvAYCMpz4Rlla8aaYwI-pWWF_tBZGMW25eUMkqpTgb_JvSUAcJPTHQEABUhFUAyNfx-KRYD4mJg; SIDCC=AKEyXzWn-72-9Od64c2j-YMs57k2Fh7SlWIEl8bOr8kD1B32L3PHg7lE8hRJQEt-6RFMglj2QA; __Secure-1PSIDCC=AKEyXzV3Y_bvzjT9vyRNJAoXquP4zux6eZL9QwkyKMNOFP9XwOH-ciqM2rZjQQrlzXkKxYMtuBY; __Secure-3PSIDCC=AKEyXzVa9jyzYbS22pF8m4-6E3Y7Pa_ZEzn1UnIX06Ls-U3IKp_UXbDiCglRFuwUDagtORB6sA"

def parse_cookies(cookie_str):
    cookies = {}
    for item in cookie_str.split(';'):
        if '=' in item:
            k, v = item.strip().split('=', 1)
            cookies[k] = v
    return cookies

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
}

cookies = parse_cookies(cookie_str)

with httpx.Client(headers=headers, cookies=cookies, follow_redirects=True) as client:
    resp = client.get("https://notebooklm.google.com/")
    print(f"Status: {resp.status_code}")
    print(f"Final URL: {resp.url}")
    
    html = resp.text
    print(f"HTML Length: {len(html)}")
    
    # Check for keywords
    for key in ["SNlM0e", "f.sid", "cfb2h"]:
        if key in html:
            print(f"Found keyword '{key}' in HTML!")
        else:
            print(f"Keyword '{key}' NOT found.")

    # Grep for SNlM0e
    at_match = re.search(r'"SNlM0e":"([^"]+)"', html)
    if not at_match:
        at_match = re.search(r'"at":"([^"]+)"', html)
    
    # Grep for f.sid
    fsid_match = re.search(r'"f.sid":"([^"]+)"', html)
    
    # Grep for bl (build label)
    bl_match = re.search(r'"cfb2h":"([^"]+)"', html)
    
    # Snippet for manual inspection if needed
    print(html[:1000])
    
    print(f"CSRF (at/SNlM0e): {at_match.group(1) if at_match else 'Not found'}")
    print(f"f.sid: {fsid_match.group(1) if fsid_match else 'Not found'}")
    print(f"bl: {bl_match.group(1) if bl_match else 'Not found'}")
    
    if at_match and fsid_match:
        data = {
            "cookies": cookies,
            "csrf_token": at_match.group(1),
            "session_id": fsid_match.group(1),
            "bl": bl_match.group(1) if bl_match else "unknown",
            "updated_at": 1772109843
        }
        with open("/Users/johnsky/.notebooklm-mcp/auth_fresh.json", "w") as f:
            json.dump(data, f, indent=2)
        print("Written /Users/johnsky/.notebooklm-mcp/auth_fresh.json")
