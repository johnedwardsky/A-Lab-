import asyncio
import sys
from telethon import TelegramClient

API_ID = 34581295
API_HASH = '9147e8599deea02cddc1e6b4e4ca2bba'
SESSION_NAME = 'scout_agent_session_temp'
TARGET_NAME = "A-Lab: Lead Monitoring"

MSG = """🎯 **ПОЛНАЯ БАЗА: ЛИЧНЫЙ БРЕНД И ЭКСПЕРТЫ**

**🎭 Личный бренд и Образ эксперта:**
• [Елена Белоусова | Личный бренд](https://t.me/Belousova_Brand)
• [Brand Hub | Брендинг и Креатив](https://t.me/brandhub_ru)
• [Pressfeed | Маркетинг и PR](https://t.me/pressfeed)
• [Тёмная сторона маркетинга](https://t.me/darkside_mark)
• [Oh my digital](https://t.me/ohmydigital)
• [Потребительское поведение](https://t.me/consumer_behavior)

**🧘‍♀️ Коучи и Женские сообщества:**
• [Все Коучи Тут | Продвижение](https://t.me/prforcoaches)
• [Практическая психология и коучинг](https://t.me/MastersPsy_Coach)
• [Мастерская Личного Бренда](https://t.me/personal_brand_workshop)
• [Target Girl](https://t.me/targetgirl)
• [Digital Broccoli](https://t.me/digitalbroccoli)
• [Money Hack](https://t.me/moneyhack)
• [Деньги для Леди](https://t.me/Cherepanina)

---
*Добавьте эти каналы в подписки, чтобы Scout Agent начал мониторинг.*
"""

async def main():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    target_entity = None
    async for dialog in client.iter_dialogs():
        if dialog.name == TARGET_NAME:
            target_entity = dialog.entity
            break
            
    if target_entity:
        await client.send_message(target_entity, MSG, link_preview=False)
        print("✅ SUCCESS")
    else:
        print("❌ NOT FOUND")
        
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
