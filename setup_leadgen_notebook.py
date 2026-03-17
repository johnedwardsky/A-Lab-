import sys
import json
import os

# Path to the notebooklm-mcp-server
sys.path.append("/Users/johnsky/.local/share/uv/tools/notebooklm-mcp-server/lib/python3.11/site-packages")

try:
    from notebooklm_mcp.api_client import NotebookLMClient
    from notebooklm_mcp.auth import load_cached_tokens
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def main():
    cached = load_cached_tokens()
    if not cached:
        print("Error: No cached tokens found. Please run the login tool or check credentials.")
        return

    client = NotebookLMClient(
        cookies=cached.cookies,
        csrf_token=cached.csrf_token,
        session_id=cached.session_id,
    )

    notebook_title = "Lead Generation Strategy"
    
    # Check if notebook already exists
    notebooks = client.list_notebooks()
    target_nb = next((nb for nb in notebooks if nb.title == notebook_title), None)
    
    if not target_nb:
        print(f"Creating notebook: {notebook_title}...")
        target_nb = client.create_notebook(title=notebook_title)
    else:
        print(f"Using existing notebook: {notebook_title} (ID: {target_nb.id})")

    # Content for the notebook
    analysis_text = """
    # Анализ Предложений Ильи (Lead Generation Strategy)
    
    ## 1. Анализ услуг и офферов
    Основываясь на предложении "Подарки девушкам до конца марта", выявлены следующие ключевые услуги:
    - **Сайт личного бренда**: 16 000 руб (скидка с 80 000). Фокус на экспертов.
    - **Разработка приложения**: 45 000 руб (скидка с 260 000). Высокий чек, сложная услуга.
    - **Веб-презентация**: 1 200 руб. Легкий вход (Hook).
    - **Логотип в векторе**: 2 600 руб. Быстрая услуга для старта.
    - **Телеграм Бот**: 3 500 руб. Актуально для автоматизации записи/продаж.
    
    ## 2. Целевая аудитория
    Женщины-предприниматели, блогеры, эксперты, мамы в бизнесе. Им важна эстетика ("Premium"), скорость (2-10 дней) и понятная цена.
    
    ## 3. Где искать клиентов?
    ### Телеграм Группы (Networking & Business):
    - **Forbes Woman Russia**: Качественная аудитория экспертов.
    - **Женский бизнес-клуб Insoul (Мск/Спб)**: Активное сообщество.
    - **МАМА КЛУБ / ПредприниМама**: Нишевые группы для мам.
    - **Чат IMExpert / Digital-чаты**: Поиск партнеров и прямых клиентов.
    - **Networking чаты (Москва/Дубай/Бали)**: @networking_msk, @networking_dubai.
    
    ### Другие площадки:
    - **Instagram**: Поиск по хештегам #личныйбренд, #дизайнсайта, #эксперт.
    - **Pinterest**: Публикация кейсов A-Lab для привлечения визуального трафика.
    - **VC.ru**: Статьи о кейсах (например, "Как дизайн увеличил конверсию эксперта").
    
    ## 4. Рекомендации для Scout-Агента
    Добавить в мониторинг ключевые слова: "нужен сайт для эксперта", "презентация для вебинара", "логотип для бренда", "запуск курса".
    """
    
    channels_list = """
    # Список полезных Телеграм-каналов и чатов для Lead Generation
    
    1. **@woman_business_insoul** - Женский бизнес клуб.
    2. **@mama_club_biz** - Сообщество мам-предпринимателей.
    3. **@forbes_woman_russia** - Контент и нетворкинг Forbes.
    4. **@finder_vc** - Поиск вакансий и проектов (дизайн, разработка).
    5. **@designer_poisk** - Чат для поиска дизайнеров.
    6. **@networking_msk** - Общий нетворкинг Москвы.
    7. **@true_business** - Сообщество предпринимателей.
    8. **@biz_people** - Бизнес люди.
    9. **@smm_chat** - Для поиска клиентов на продвижение и ботов.
    10. **@web_dev_chat** - Технические запросы на разработку.
    """

    print("Adding sources to notebook...")
    client.add_text_source(target_nb.id, text=analysis_text, title="Ilya Proposal Analysis")
    client.add_text_source(target_nb.id, text=channels_list, title="TG Channels List")
    
    print(f"\nSuccessfully updated notebook '{notebook_title}'!")
    print(f"Notebook Link: https://notebooklm.google.com/notebook/{target_nb.id}")

if __name__ == "__main__":
    main()
