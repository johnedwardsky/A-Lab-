import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command

# --- КОНФИГУРАЦИЯ ---
API_TOKEN = '8660317634:AAH1RlWOA4d0Un0J_rpNvTi00LXi1MIGVjo'
ADMIN_ID = None  # Сюда бот пришлет ваш ID при первом запуске, чтобы знать, кому слать лиды

# Ключевые слова для поиска
KEYWORDS = [
    "нужен сайт", "нужна разработка", "ищу дизайнера", "логотип", 
    "лого", "сделать бота", "тг бот", "телеграм бот", 
    "сайт-визитка", "лендинг", "презентация", "личный бренд",
    "нужен лендинг", "разработка сайта", "заказать сайт",
    "сайт под ключ", "дизайн сайта", "дизайн лого", "нужна презентация",
    "сайт для эксперта", "презентация для вебинара", "логотип для бренда",
    "запуск курса", "дизайн для эксперта", "упаковка бренда", "сайт для блогера"
]

# Настройка логирования
logging.basicConfig(level=logging.INFO)

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(f"🚀 **Агент-Разведчик запущен!**\n\nВаш ID: `{message.from_user.id}`\nДобавьте меня в группы, где нужно искать клиентов, и сделайте администратором (чтобы я видел сообщения).")
    print(f"--- Агент запущен пользователем {message.from_user.full_name} (ID: {message.from_user.id}) ---")

@dp.message()
async def monitor_messages(message: types.Message):
    # Пропускаем сообщения от самого бота
    if message.from_user.is_bot:
        return

    text = (message.text or message.caption or "").lower()
    if not text:
        return

    # Проверка на наличие ключевых слов
    found_keywords = [kw for kw in KEYWORDS if kw in text]
    
    if found_keywords:
        # Формируем отчет
        chat_info = f"👥 Чат: {message.chat.title or 'Личка'}"
        if message.chat.username:
            chat_info += f" (@{message.chat.username})"
        
        user_info = f"👤 От: {message.from_user.full_name}"
        if message.from_user.username:
            user_info += f" (@{message.from_user.username})"

        report = (
            f"🔥 **ОБНАРУЖЕН НОВЫЙ ЛИД!**\n\n"
            f"{user_info}\n"
            f"{chat_info}\n"
            f"🏷 Теги: {', '.join(found_keywords)}\n\n"
            f"💬 Текст:\n_{message.text}_\n\n"
            f"🔗 [Ссылка на сообщение](https://t.me/{message.chat.username}/{message.message_id})" if message.chat.username else ""
        )

        # Вывод в консоль
        print(f"\n🔥 Нашел лида в чате '{message.chat.title}'!")
        print(f"Юзер: {message.from_user.full_name} (@{message.from_user.username})")
        
        # Если вы хотите, чтобы бот пересылал вам лиды в личку, 
        # сначала напишите ему /start, узнайте свой ID и впишите его в ADMIN_ID в начале файла.
        # Пока что он будет просто выводить информацию в консоль.

async def main():
    print("🛰 Бот начал прослушивание чатов...")
    await dp.start_polling(bot)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 Бот остановлен.")
