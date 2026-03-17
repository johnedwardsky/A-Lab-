import asyncio
from telethon import TelegramClient
import os

# --- КОНФИГУРАЦИЯ ---
API_ID = 34581295
API_HASH = '9147e8599deea02cddc1e6b4e4ca2bba'
SESSION_NAME = '/Users/johnsky/Documents/A-lab.tech/scout_agent_session'
TARGET_USER = "@van_lax"

OFFER_PATH = "/Users/johnsky/.gemini/antigravity/brain/773f34a1-5c19-4bca-9e20-86d8e835958b/baucenter_offer.md"

async def main():
    if not os.path.exists(OFFER_PATH):
        print(f"❌ Файл {OFFER_PATH} не найден.")
        return

    with open(OFFER_PATH, 'r', encoding='utf-8') as f:
        offer_text = f.read()

    print(f"🚀 Отправка предложения для Бауцентра пользователю {TARGET_USER}...")
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    try:
        # Отправляем текст предложения
        # Если текст слишком длинный, Telethon сам может его разбить, 
        # но лучше сделать это явно или отправить как файл.
        # Пользователь просил "отправить Baucenter Offer", обычно это значит текст или файл.
        # Отправим и текст (если влезет) и файл для надежности.
        
        await client.send_message(TARGET_USER, "Привет! Вот подготовленное предложение для Бауцентра:")
        
        if len(offer_text) > 4000:
            chunks = [offer_text[i:i+4000] for i in range(0, len(offer_text), 4000)]
            for chunk in chunks:
                await client.send_message(TARGET_USER, chunk)
        else:
            await client.send_message(TARGET_USER, offer_text)
            
        # Также отправим файл
        await client.send_file(TARGET_USER, OFFER_PATH, caption="Baucenter_Offer.md")
        
        print("✅ Предложение успешно отправлено в Telegram!")
    except Exception as e:
        print(f"❌ Ошибка при отправке: {e}")
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
