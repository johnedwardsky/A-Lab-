import sys
import json
import os
import httpx

# Add the library to path
sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")

# Set the correct build label found in the browser
os.environ["NOTEBOOKLM_BL"] = "boq_labs-tailwind-frontend_20260224.20_p0"

from notebooklm_mcp.api_client import NotebookLMClient

def parse_cookies(cookie_str):
    cookies = {}
    for item in cookie_str.split(';'):
        if '=' in item:
            k, v = item.strip().split('=', 1)
            cookies[k] = v
    return cookies

def verify():
    cookie_str = "SEARCH_SAMESITE=CgQI8p8B; AEC=AaJma5v2oySZQXRybTXWypQrlTDFUo54-pSwWBpFBvTHf0OHPWFx_7qepCA; __Secure-BUCKET=CEw; SID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxKlPcKpRuaJIdHLRpGnJUXgACgYKAV4SAQ8SFQHGX2MinG-Cv9BEWlalmKzhAKfFoRoVAUF8yKrNUFZVi7byXyvXa6FXnSgy0076; __Secure-1PSID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxmwpgTnkLSEOIRGe126lMKwACgYKASMSAQ8SFQHGX2MinvtClcOASsvu7Rx48mclphoVAUF8yKpGsdLLmyP4cYOP2ZwZMWaX0076; __Secure-3PSID=g.a0007AiQs62ru6ZaSYdBHD8FatKUyp0aoGirAz8Fh5TwnOmIUxZxPHbgGis0k9o0doplo9b-mwACgYKAe8SAQ8SFQHGX2MigBWiYlEJDcIPI5nFV7J-LRoVAUF8yKo-AKRetksjuRUWp_L3DEsh0076; HSID=AiDyqsbMvbL3lQhsA; SSID=AuJ2Mu2HJ21Xo4Eo9; APISID=d_6c32KCPdNxi5DY/AOflqhvIWKPEk3Uzv; SAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; __Secure-1PAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; __Secure-3PAPISID=2kKFMcbLdvYI4htq/AGYEFTG7mYEIO1omV; NID=529=tc7CxUN4aP9zAKS2uvZ27wdaHLoLCYseXV0_lLR27TH6AUMtoarXVr5uG2VCVP5JuHPcACowtilJlIWd47zbDuuizsgEs-9r45DwE4fiETfWMtLYtVes5F8yPdDXVxo7I7OzwoOHHywj-cX4-hmBDnKzo3ohH3Po5lxxjBgF9SGCespe7yGhaWrQJ5MQ8p5hKhP-rmLBkFZzsKxCU-bjtxF_Q2t2CIFBFx1ak5PYuTNKJfylOcoujS9Z7dM_bg8A5OkHvIAWn9ZRTzyacEA-EVUlhb-F3Fr4ITKFfvPgB_b0h9IHpdZ4hBz3YdqSwPkT-mttimY4CyNVuKZ3k4azsxB32CjJs8Jfxv56aiqUEsJdii3pNYmNz6ewGerjqFgALc30U-xYolmWY4-kgFAl4g8001fYw0lO05BRbqhlCrNZVd7uXt-hwXs2xvGN1yrs2sc11AZUOqUU9PNIocKPzpUAsKmu39pNpIKahnWIh4Na7ajLS38-HXkrruYNkE50VaOzw9ldbRI70jyzk_e6V51CmkvVZ3AWLvPxFRydOUA8dyaDYaSi77ty1tR7_hXgsQbiXZH6juaAUwnZHp_tou6VH2KG5wJaeIlhpWGg_0HW2gUUdWob8SgEnHgdRGosis-lS6W3uVeJ1Vzf_sVZUqm1po4JaUpnkj-Ozy1dvjyerQL6sdKxy-bb7YyzKdoLTA0PYA; OSID=g.a0007AiQswBjnnq1n67tPtEtQCpghU_SNNrnadr5yMFOKh41EBzhBXiLrTwE8_HbCHyoWG2FWAACgYKAYsSARESFQHGX2MiDWZ5GQ0r96M7qFeknO9WaBoVAUF8yKoMPKsKqrfAK2e_asgis00S0076; __Secure-OSID=g.a0007AiQswBjnnq1n67tPtEtQCpghU_SNNrnadr5yMFOKh41EBzhqvJXOuOJsZZTAXxOqFofNQACgYKAUsSARESFQHGX2MiWyHnBSOnffYY_-zw27AX8RoVAUF8yKpyjj5kklSGAPz_c9qk9bIR0076; _gcl_au=1.1.817191886.1772053168; _ga=GA1.1.343933502.1772053169; __Secure-ENID=31.SE=J6pxbQOjYHSzH5HiRX_kCGycZKssJ_72s5lVLZ-gheyg8kGUN3jn-eZT4XC7t7ZTkoTnM1gbsK184y9O-Jzp7Daf7Ccyt2juUdoIV-jvKySZEcUvV1MGpu8TIoDTbC9EsEianirxYBOOgvr-vOE6jW5aSNzdovxc6HYxZQh8gB9GO8mM_z0jklfRLhrPWKii4TLYDJ-5pqkEjwHBhaiv4wynmVJoe65kBc4Zxn5J_Q4Bf3EGgGPRhP5j3B7-fH745BCkTi_3xVo_ZkFPdfdwI2xNgp985T34zDoLlLV3tmSVRJBw5-LSSkWceg; __Secure-1PSIDTS=sidts-CjEBBj1CYkPCHf4gnRjbOnMtNRlX5nSPHSdLsSxi7Xm5leZj26i9FeeMhc86LLiDdeqyEAA; __Secure-3PSIDTS=sidts-CjEBBj1CYkPCHf4gnRjbOnMtNRlX5nSPHSdLsSxi7Xm5leZj26i9FeeMhc86LLiDdeqyEAA; _ga_W0LDH41ZCB=GS2.1.s1772053168$o1$g1$t1772054468$j35$l0$h0; SIDCC=AKEyXzVqpDQ0JPMwCib3B9eKkhcAnheZLEPWSkcRRWJcmx1wipB8HHBpdewtObICv66uBv_j; __Secure-1PSIDCC=AKEyXzXQv4B05oFGqFJi3LBOUo0wCVlI8qJuSjYENqRQ60O1XWVg4R0uYJgXoB1jGNhABMAbGw; __Secure-3PSIDCC=AKEyXzUruTN9tUpz8OWdfCBnoY1yCLx3k-qg7XkdXZUldARCrOVMZ43BzUsbNWRlzdmKsXht"
    cookies = parse_cookies(cookie_str)
    
    # Freshly extracted values from notebook internal request
    csrf_token = "AIXQIkZG48o-WGetZ85B1o7bRSg4:1772054430236"
    f_sid = "1276975487212821000"
    user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
    
    client = NotebookLMClient(cookies=cookies, csrf_token=csrf_token, session_id=f_sid)
    
    # Override User-Agent to match browser
    client._PAGE_FETCH_HEADERS["User-Agent"] = user_agent
    
    # Temporarily hack the internal client headers if it was already created (though it shouldn't be yet)
    if client._client:
        client._client.headers["User-Agent"] = user_agent

    print(f"Testing connection with Session ID: {f_sid}")
    try:
        notebooks = client.list_notebooks()
        print(f"SUCCESS! Found {len(notebooks)} notebooks.")
        for nb in notebooks[:10]:
            print(f"- {nb.title} (ID: {nb.id})")
            
        # If success, update the main auth.json
        auth_data = {
            "cookies": cookies,
            "csrf_token": csrf_token,
            "session_id": f_sid,
            "extracted_at": 1772054500
        }
        with open("/Users/johnsky/.notebooklm-mcp/auth.json", "w") as f:
            json.dump(auth_data, f, indent=2)
        print("Updated ~/.notebooklm-mcp/auth.json")
            
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    verify()
