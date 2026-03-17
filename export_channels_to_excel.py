import pandas as pd
import os

# Списки каналов по категориям
data = [
    # Топ-группы для экспертов и бизнеса
    {"Category": "Experts & Business", "Name": "Forbes Woman Russia", "URL": "https://t.me/forbes_woman_russia", "Description": "Качественный нетворкинг и инсайды"},
    {"Category": "Experts & Business", "Name": "Женский Бизнес-Клуб Insoul", "URL": "https://t.me/woman_business_insoul", "Description": "Активная аудитория (Мск/Спб)"},
    {"Category": "Experts & Business", "Name": "МАМА КЛУБ / ПредприниМама", "URL": "https://t.me/mama_club_biz", "Description": "Идеальная ниша для личного бренда"},
    {"Category": "Experts & Business", "Name": "Finder.vc", "URL": "https://t.me/finder_vc", "Description": "Заказы на разработку и дизайн"},
    {"Category": "Experts & Business", "Name": "Дизайнер, Поиск!", "URL": "https://t.me/designer_poisk", "Description": "Прямые запросы на графику и сайты"},
    {"Category": "Experts & Business", "Name": "Web Dev Chat", "URL": "https://t.me/web_dev_chat", "Description": "Технические запросы и партнерства"},
    
    # Разработка и IT-заказы
    {"Category": "Development & IT", "Name": "Digital Tender", "URL": "https://t.me/digitaltender", "Description": "Тендеры на разработку и маркетинг"},
    {"Category": "Development & IT", "Name": "Хабр Фриланс", "URL": "https://t.me/freelansim_ru_bot", "Description": "Бот/фильтр для заказов с Хабра"},
    {"Category": "Development & IT", "Name": "IT-CLAN", "URL": "https://t.me/itclan", "Description": "Вакансии и проекты от веб-студий"},
    {"Category": "Development & IT", "Name": "Deep Digital", "URL": "https://t.me/deep_digital", "Description": "Чат digital-специалистов"},
    {"Category": "Development & IT", "Name": "JavaScript Jobs", "URL": "https://t.me/javascriptjobs", "Description": "Узкоспециализированные заказы"},
    
    # Маркетинг, Дизайн и SMM
    {"Category": "Marketing & Design", "Name": "SMM LEADS", "URL": "https://t.me/smm_leads", "Description": "Запросы на продвижение и чат-ботов"},
    {"Category": "Marketing & Design", "Name": "Work | Digital", "URL": "https://t.me/workdist", "Description": "Удаленные вакансии в диджитал"},
    {"Category": "Marketing & Design", "Name": "Норм работа", "URL": "https://t.me/normrabota", "Description": "Качественные вакансии (часто ищут на аутсорс)"},
    {"Category": "Marketing & Design", "Name": "Design Hunters", "URL": "https://t.me/designhunters", "Description": "Поиск дизайнеров"},
    {"Category": "Marketing & Design", "Name": "Дизайн-биржа", "URL": "https://t.me/designbirzha", "Description": "Чат с заказами на графику/сайты"},
    
    # Общие и Нетворкинг
    {"Category": "Networking", "Name": "Фриланс Таверна", "URL": "https://t.me/fl_tavern", "Description": "Активное сообщество с заказами"},
    {"Category": "Networking", "Name": "Distantsiya", "URL": "https://t.me/distantsiya", "Description": "Работа на удаленке"},
    {"Category": "Networking", "Name": "Networking Moscow", "URL": "https://t.me/networking_msk", "Description": "Нетворкинг Москва"},
    {"Category": "Networking", "Name": "Networking Dubai", "URL": "https://t.me/networking_dubai", "Description": "Нетворкинг Дубай"},
    {"Category": "Networking", "Name": "True Business", "URL": "https://t.me/true_business", "Description": "Сообщество предпринимателей"}
]

# Создание DataFrame
df = pd.DataFrame(data)

# Путь для сохранения
output_file = "/Users/johnsky/Documents/A-lab.tech/TG_Lead_Channels_2026.xlsx"

# Экспорт в Excel (используя openpyxl, если установлена)
try:
    df.to_excel(output_file, index=False)
    print(f"SUCCESS: File saved to {output_file}")
except Exception as e:
    # Попытка сохранения в CSV, если Excel не работает
    csv_file = output_file.replace(".xlsx", ".csv")
    df.to_csv(csv_file, index=False)
    print(f"WARNING: Excel export failed ({e}). Saved as CSV instead: {csv_file}")
