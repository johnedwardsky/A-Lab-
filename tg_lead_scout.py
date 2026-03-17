import os
import asyncio
import re
from telethon import TelegramClient, events

# --- КОНФИГУРАЦИЯ ---
# Получите API_ID и API_HASH на https://my.telegram.org
API_ID = os.getenv('TG_API_ID', 'YOUR_API_ID') 
API_HASH = os.getenv('TG_API_HASH', 'YOUR_API_HASH')
SESSION_NAME = 'my_session' # Имя файла сессии

# Ключевые слова для поиска (можно дополнять)
KEYWORDS = [
    "нужен сайт", "нужна разработка", "ищу дизайнера", "логотип", 
    "лого", "сделать бота", "тг бот", "телеграм бот", 
    "сайт-визитка", "лендинг", "презентация", "личный бренд",
    "нужен лендинг", "разработка сайта", "заказать сайт",
    "сайт под ключ", "дизайн сайта", "дизайн лого", "нужна презентация"
]

# Чаты для мониторинга (юзернеймы или ссылки без @)
# ВАЖНО: Вы должны состоять в этих чатах
CHATS_TO_MONITOR = [
    'networking_woman', 
    'business_woman_chat',
    'probiz_chat',
    'woman_bz',
    'instoprofi_chat'
]

async def main():
    if API_ID == 'YOUR_API_ID':
        print("\n" + "!"*50)
        print("❌ ОШИБКА: Вам нужно указать API_ID и API_HASH.")
        print("Получите их здесь: https://my.telegram.org")
        print("Затем вставьте их в начало файла tg_lead_scout.py или установите переменные окружения.")
        print("!"*50 + "\n")
        return

    print(f"🛰 Запуск Агента-Поисковика...")
    
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    
    @client.on(events.NewMessage(chats=CHATS_TO_MONITOR))
    async def handler(event):
        try:
            text = event.message.message.lower()
            
            # Проверка на наличие ключевых слов
            found_keywords = [kw for kw in KEYWORDS if kw in text]
            
            if found_keywords:
                sender = await event.get_sender()
                sender_name = getattr(sender, 'username', 'N/A')
                first_name = getattr(sender, 'first_name', 'Пользователь')
                
                print(f"\n🔥 ОБНАРУЖЕН ЛИД!")
                print(f"👤 От: {first_name} (@{sender_name})")
                print(f"🏷 Теги: {', '.join(found_keywords)}")
                print(f"💬 Сообщение: {event.message.message[:200]}...")
                print(f"🔗 Чат: https://t.me/{event.chat.username if hasattr(event.chat, 'username') else 'c/' + str(event.chat_id)}")
                print("-" * 30)
                
                # Опционально: отправить сообщение себе в "Избранное"
                await client.send_message('me', 
                    f"🔥 **Новый лид!**\n\n"
                    f"👤 От: {first_name} (@{sender_name})\n"
                    f"🏷 Ключи: {', '.join(found_keywords)}\n\n"
                    f"💬 `{event.message.message}`\n\n"
                    f"---"
                )
        except Exception as e:
            print(f"⚠ Ошибка при обработке сообщения: {e}")

    await client.start()
    print(f"✅ Агент активен. Мониторинг чатов: {', '.join(CHATS_TO_MONITOR)}")
    print("Нажмите Ctrl+C для остановки.")
    await client.run_until_disconnected()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Агент остановлен.")
