import asyncio
from telethon import TelegramClient
from telethon.tl.types import Channel, Chat

API_ID = 34581295
API_HASH = '9147e8599deea02cddc1e6b4e4ca2bba'
SESSION_NAME = 'scout_agent_session'

async def main():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    print("--- Список ваших диалогов (Каналы и Группы) ---")
    async for dialog in client.iter_dialogs():
        entity = dialog.entity
        type_str = "Unknown"
        if isinstance(entity, Channel):
            if entity.broadcast:
                type_str = "Channel"
            else:
                type_str = "MegaGroup"
        elif isinstance(entity, Chat):
            type_str = "Group"
            
        print(f"Name: {dialog.name} | ID: {dialog.id} | Type: {type_str}")
    
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
