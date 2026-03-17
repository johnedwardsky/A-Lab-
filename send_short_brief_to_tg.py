import asyncio
from telethon import TelegramClient
import os

# --- КОНФИГУРАЦИЯ ---
API_ID = 34581295
API_HASH = '9147e8599deea02cddc1e6b4e4ca2bba'
SESSION_NAME = 'scout_agent_session'
TARGET_CHANNEL_NAME = "A-Lab: Lead Monitoring"

BRIEF_PATH = "/Users/johnsky/.gemini/antigravity/brain/dcf353f7-b7cf-4746-89a3-ee94de369487/short_brief_svetlana.md"

async def main():
    if not os.path.exists(BRIEF_PATH):
        print(f"❌ Файл {BRIEF_PATH} не найден.")
        return

    with open(BRIEF_PATH, 'r', encoding='utf-8') as f:
        brief_text = f.read()

    print(f"🚀 Отправка КОРОТКОГО брифа в '{TARGET_CHANNEL_NAME}'...")
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    target_entity = None
    async for dialog in client.iter_dialogs():
        if dialog.name == TARGET_CHANNEL_NAME:
            target_entity = dialog.entity
            break
            
    if not target_entity:
        print(f"❌ Группа '{TARGET_CHANNEL_NAME}' не найдена.")
        await client.disconnect()
        return

    # Отправляем сообщение
    await client.send_message(target_entity, brief_text)
        
    print("✅ Короткий бриф успешно отправлен в Telegram!")
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
