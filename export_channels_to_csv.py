import csv

# Списки каналов по категориям
data = [
    ["Category", "Name", "URL", "Description"],
    ["Experts & Business", "Forbes Woman Russia", "https://t.me/forbes_woman_russia", "Качественный нетворкинг и инсайды"],
    ["Experts & Business", "Женский Бизнес-Клуб Insoul", "https://t.me/woman_business_insoul", "Активная аудитория (Мск/Спб)"],
    ["Experts & Business", "МАМА КЛУБ / ПредприниМама", "https://t.me/mama_club_biz", "Идеальная ниша для личного бренда"],
    ["Experts & Business", "Finder.vc", "https://t.me/finder_vc", "Заказы на разработку и дизайн"],
    ["Experts & Business", "Дизайнер, Поиск!", "https://t.me/designer_poisk", "Прямые запросы на графику и сайты"],
    ["Experts & Business", "Web Dev Chat", "https://t.me/web_dev_chat", "Технические запросы и партнерства"],
    
    ["Development & IT", "Digital Tender", "https://t.me/digitaltender", "Тендеры на разработку и маркетинг"],
    ["Development & IT", "Хабр Фриланс", "https://t.me/freelansim_ru_bot", "Бот/фильтр для заказов с Хабра"],
    ["Development & IT", "IT-CLAN", "https://t.me/itclan", "Вакансии и проекты от веб-студий"],
    ["Development & IT", "Deep Digital", "https://t.me/deep_digital", "Чат digital-специалистов"],
    ["Development & IT", "JavaScript Jobs", "https://t.me/javascriptjobs", "Узкоспециализированные заказы"],
    
    ["Marketing & Design", "SMM LEADS", "https://t.me/smm_leads", "Запросы на продвижение и чат-ботов"],
    ["Marketing & Design", "Work | Digital", "https://t.me/workdist", "Удаленные вакансии в диджитал"],
    ["Marketing & Design", "Норм работа", "https://t.me/normrabota", "Качественные вакансии"],
    ["Marketing & Design", "Design Hunters", "https://t.me/designhunters", "Поиск дизайнеров"],
    ["Marketing & Design", "Дизайн-биржа", "https://t.me/designbirzha", "Чат с заказами на графику/сайты"],
    
    ["Networking", "Фриланс Таверна", "https://t.me/fl_tavern", "Активное сообщество с заказами"],
    ["Networking", "Distantsiya", "https://t.me/distantsiya", "Работа на удаленке"],
    ["Networking", "Networking Moscow", "https://t.me/networking_msk", "Нетворкинг Москва"],
    ["Networking", "Networking Dubai", "https://t.me/networking_dubai", "Нетворкинг Дубай"],
    ["Networking", "True Business", "https://t.me/true_business", "Сообщество предпринимателей"]
]

output_file = "/Users/johnsky/Documents/A-lab.tech/TG_Lead_Channels_2026.csv"

with open(output_file, mode='w', encoding='utf-8-sig', newline='') as file:
    writer = csv.writer(file, delimiter=';')
    writer.writerows(data)

print(f"SUCCESS: Exported {len(data)-1} channels to {output_file}")
