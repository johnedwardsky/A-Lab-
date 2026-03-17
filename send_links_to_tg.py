import asyncio
from telethon import TelegramClient

# --- КОНФИГУРАЦИЯ (из scout_agent_v2.py) ---
API_ID = 34581295
API_HASH = '9147e8599deea02cddc1e6b4e4ca2bba'
SESSION_NAME = 'scout_agent_session'
TARGET_CHANNEL_NAME = "A-Lab: Lead Monitoring"

# Список каналов для отправки
CHANNELS = [
    {"Category": "🌟 Experts & Business", "Links": [
        ("Forbes Woman Russia", "https://t.me/forbes_woman_russia"),
        ("Женский Бизнес-Клуб Insoul", "https://t.me/woman_business_insoul"),
        ("МАМА КЛУБ / ПредприниМама", "https://t.me/mama_club_biz"),
        ("Finder.vc", "https://t.me/finder_vc"),
        ("Дизайнер, Поиск!", "https://t.me/designer_poisk"),
        ("Web Dev Chat", "https://t.me/web_dev_chat")
    ]},
    {"Category": "💻 Development & IT", "Links": [
        ("Digital Tender", "https://t.me/digitaltender"),
        ("Хабр Фриланс", "https://t.me/freelansim_ru_bot"),
        ("IT-CLAN", "https://t.me/itclan"),
        ("Deep Digital", "https://t.me/deep_digital"),
        ("JavaScript Jobs", "https://t.me/javascriptjobs")
    ]},
    {"Category": "🎨 Marketing & Design", "Links": [
        ("SMM LEADS", "https://t.me/smm_leads"),
        ("Work | Digital", "https://t.me/workdist"),
        ("Норм работа", "https://t.me/normrabota"),
        ("Design Hunters", "https://t.me/designhunters"),
        ("Дизайн-биржа", "https://t.me/designbirzha")
    ]},
    {"Category": "🌍 Networking", "Links": [
        ("Фриланс Таверна", "https://t.me/fl_tavern"),
        ("Distantsiya", "https://t.me/distantsiya"),
        ("Networking Moscow", "https://t.me/networking_msk"),
        ("Networking Dubai", "https://t.me/networking_dubai"),
        ("True Business", "https://t.me/true_business")
    ]},
    {"Category": "🧘‍♀️ Female Coaches & Experts", "Links": [
        ("Все Коучи Тут | Продвижение", "https://t.me/prforcoaches"),
        ("Практическая психология и коучинг", "https://t.me/MastersPsy_Coach"),
        ("Мастерская Личного Бренда", "https://t.me/personal_brand_workshop"),
        ("Target Girl", "https://t.me/targetgirl"),
        ("Digital Broccoli", "https://t.me/digitalbroccoli"),
        ("Money Hack", "https://t.me/moneyhack"),
        ("Деньги для Леди", "https://t.me/Cherepanina")
    ]},
    {"Category": "🎭 Personal Brand & Image", "Links": [
        ("Елена Белоусова | Личный бренд", "https://t.me/Belousova_Brand"),
        ("Brand Hub | Брендинг", "https://t.me/brandhub_ru"),
        ("Pressfeed | PR эксперта", "https://t.me/pressfeed"),
        ("Тёмная сторона маркетинга", "https://t.me/darkside_mark"),
        ("Oh my digital", "https://t.me/ohmydigital"),
        ("Потребительское поведение", "https://t.me/consumer_behavior")
    ]}
]

async def main():
    print(f"🚀 Запуск отправки ссылок в '{TARGET_CHANNEL_NAME}'...")
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    target_entity = None
    async for dialog in client.iter_dialogs():
        if dialog.name == TARGET_CHANNEL_NAME:
            target_entity = dialog.entity
            break
            
    if not target_entity:
        print(f"❌ Группа '{TARGET_CHANNEL_NAME}' не найдена. Создайте её или измените TARGET_CHANNEL_NAME в скрипте.")
        return

    message = "🎯 **АКТУАЛЬНАЯ БАЗА КАНАЛОВ ДЛЯ ГЕНЕРАЦИИ ЛИДОВ (2026)**\n\n"
    message += "Добавьте эти ресурсы в свои подписки, чтобы Scout Agent начал мониторинг.\n\n"
    
    for cat in CHANNELS:
        message += f"**{cat['Category']}**\n"
        for name, url in cat['Links']:
            message += f"• [{name}]({url})\n"
        message += "\n"
        
    message += "---"
    
    await client.send_message(target_entity, message, link_preview=False)
    print("✅ Список ссылок успешно отправлен в группу!")
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
