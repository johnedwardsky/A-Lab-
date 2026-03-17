import os
import asyncio
from telethon import TelegramClient, events
from telethon.tl.types import Channel, PeerChannel
from telethon.tl.functions.channels import GetFullChannelRequest, JoinChannelRequest

# --- КОНФИГУРАЦИЯ ---
API_ID = 34581295
API_HASH = '9147e8599deea02cddc1e6b4e4ca2bba'
SESSION_NAME = 'scout_agent_session'
TARGET_CHANNEL_NAME = "A-Lab: Lead Monitoring"

# Ключевые слова
KEYWORDS = [
    "нужен сайт", "нужна разработка", "ищу дизайнера", "логотип", 
    "лого", "сделать бота", "тг бот", "телеграм бот", 
    "сайт-визитка", "лендинг", "презентация", "личный бренд",
    "нужен лендинг", "разработка сайта", "заказать сайт",
    "сайт под ключ", "дизайн сайта", "дизайн лого", "нужна презентация",
    "создать сайт", "нужна помощь с сайтом", "дизайнер сайтов",
    "сайт для эксперта", "презентация для вебинара", "логотип для бренда",
    "запуск курса", "дизайн для эксперта", "упаковка бренда", "сайт для блогера"
]

# Кэш для отслеживания уже присоединенных чатов обсуждения
joined_discussions = set()

async def join_discussion_if_needed(client, chat_id):
    """Находит и вступает в чат обсуждения канала для мониторинга комментариев"""
    if chat_id in joined_discussions:
        return
    
    try:
        full_channel = await client(GetFullChannelRequest(chat_id))
        discussion_id = full_channel.full_chat.linked_chat_id
        if discussion_id:
            await client(JoinChannelRequest(discussion_id))
            print(f"🔗 Подключена ветка комментариев для чата ID: {chat_id}")
            joined_discussions.add(chat_id)
            return discussion_id
    except Exception as e:
        # Может возникнуть, если уже в чате или нет обсуждения
        joined_discussions.add(chat_id)
    return None

async def main():
    print("\n" + "="*50)
    print("🚀 АГЕНТ-РАЗВЕДЧИК v2.1: С ПОИСКОМ В КОММЕНТАРИЯХ")
    print("="*50)
    
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    # Ищем наш канал для отчетов
    target_entity = 'me'
    print(f"🔍 Поиск канала '{TARGET_CHANNEL_NAME}'...")
    
    async for dialog in client.iter_dialogs():
        if dialog.name == TARGET_CHANNEL_NAME:
            target_entity = dialog.entity
            print(f"✅ Канал найден! Лиды летят в: {TARGET_CHANNEL_NAME}")
            break
    
    if target_entity == 'me':
        print(f"ℹ️ Канал '{TARGET_CHANNEL_NAME}' не найден. Шлем в Избранное.")

    # Авто-вступление в обсуждения всех текущих каналов
    print("📋 Проверка существующих каналов на наличие чатов обсуждения...")
    async for dialog in client.iter_dialogs():
        if dialog.is_channel and not getattr(dialog.entity, 'megagroup', False):
            await join_discussion_if_needed(client, dialog.id)

    @client.on(events.NewMessage)
    async def handler(event):
        # 1. Если это новый пост в канале, пробуем подключиться к его комментариям
        if event.is_channel and not event.is_group:
            await join_discussion_if_needed(client, event.chat_id)

        # 2. Мониторим сообщения в группах и каналах
        if event.is_group or event.is_channel:
            # Не мониторим наш собственный канал с отчетами
            if hasattr(target_entity, 'id') and event.chat_id == target_entity.id:
                return

            text = (event.message.message or "").lower()
            found_keywords = [kw for kw in KEYWORDS if kw in text]
            
            if found_keywords:
                # Проверка: это комментарий или пост?
                # В Telegram обсуждениях комментарии - это ответы (reply)
                is_comment = event.message.reply_to is not None
                type_label = "💬 КОММЕНТАРИЙ" if is_comment else "✉️ СООБЩЕНИЕ"
                
                try:
                    sender = await event.get_sender()
                    sender_id = event.sender_id
                    sender_name = getattr(sender, 'username', None)
                    first_name = getattr(sender, 'first_name', 'Пользователь')
                    
                    if sender_name:
                        user_link = f"https://t.me/{sender_name}"
                    else:
                        user_link = f"tg://user?id={sender_id}"
                    
                    chat = await event.get_chat()
                    chat_title = getattr(chat, 'title', 'Чат')
                    chat_username = getattr(chat, 'username', None)
                    
                    # Ссылка на само сообщение
                    if chat_username:
                        msg_link = f"https://t.me/{chat_username}/{event.message.id}"
                    else:
                        # Для закрытых чатов ссылка формируется иначе
                        clean_peer_id = str(event.chat_id).replace("-100", "")
                        msg_link = f"https://t.me/c/{clean_peer_id}/{event.message.id}"

                    print(f"🔥 Лид найден! [{type_label}] От: {first_name}")

                    report = (
                        f"⚡️ **{type_label}**\n\n"
                        f"👤 **Клиент:** [{first_name}]({user_link})\n"
                        f"📍 **Источник:** {chat_title}\n"
                        f"🏷 **Запрос:** {', '.join(found_keywords).upper()}\n\n"
                        f"📝 **Текст:**\n_{event.message.message}_\n\n"
                        f"🔗 [ПЕРЕЙТИ К СООБЩЕНИЮ]({msg_link})\n"
                        f"---"
                    )
                    
                    await client.send_message(target_entity, report, link_preview=False)
                    # Пересылаем оригинал
                    await event.message.forward_to(target_entity)
                    
                except Exception as e:
                    print(f"⚠ Ошибка: {e}")

    print(f"\n📡 Мониторинг запущен. Агент слушает и комментарии...")
    await client.run_until_disconnected()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Агент остановлен.")

