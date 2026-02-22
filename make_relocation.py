import re

path = '/Users/johnsky/Documents/balthomes.ru/index.html'
out_path = '/Users/johnsky/Documents/balthomes.ru/relocation.html'

with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# find header end
header_end = html.find('</header>') + len('</header>')

# find footer start
footer_start = html.find('<footer')

top_html = html[:header_end]
bottom_html = html[footer_start:]

title_re = re.compile(r'<title>.*?</title>')
top_html = title_re.sub('<title>Переезд в Калининград с Дальнего Востока и Сибири | BaltHomes</title>', top_html)

desc_re = re.compile(r'<meta name="description"\s+content=".*?">')
top_html = desc_re.sub('<meta name="description" content="Гид по покупке недвижимости в Калининграде для жителей Дальнего Востока и Сибири. Дистанционные сделки, ипотека, честный риэлтор.">', top_html)

content = """
    <section>
        <div class="container">
            <h1 style="text-align: center; margin-top: 40px; font-size: 36px;">Переезд в Калининград с Дальнего Востока и Сибири: Полный гид 2026</h1>
            <p style="text-align: center; font-size: 18px; color: #555; margin-bottom: 50px;">Безопасная покупка недвижимости, дистанционные сделки и адаптация на новом месте.</p>
            
            <div style="display: flex; gap: 40px; flex-wrap: wrap; margin-bottom: 60px;">
                <div style="flex: 1; min-width: 300px; background: var(--bg-light); padding: 30px; border-radius: 15px; box-shadow: var(--shadow);">
                    <div style="font-size: 40px; color: var(--accent); margin-bottom: 20px;"><i class="fas fa-clock"></i></div>
                    <h3 style="margin-top: 0;">Разница во времени — не проблема</h3>
                    <p>Мы понимаем особенности работы с клиентами из Владивостока, Хабаровска и Камчатки. На связи в удобное для вас время. Выбирайте объекты и консультируйтесь без привязки к московскому часовому поясу.</p>
                </div>
                
                <div style="flex: 1; min-width: 300px; background: var(--bg-light); padding: 30px; border-radius: 15px; box-shadow: var(--shadow);">
                    <div style="font-size: 40px; color: var(--accent); margin-bottom: 20px;"><i class="fas fa-laptop-house"></i></div>
                    <h3 style="margin-top: 0;">100% Дистанционные сделки</h3>
                    <p>Безопасная покупка недвижимости онлайн: электронная регистрация Росреестра, безопасные расчеты через аккредитив или СБР. Вам не нужно прилетать в Калининград для подписания договора.</p>
                </div>
                
                <div style="flex: 1; min-width: 300px; background: var(--bg-light); padding: 30px; border-radius: 15px; box-shadow: var(--shadow);">
                    <div style="font-size: 40px; color: var(--accent); margin-bottom: 20px;"><i class="fas fa-plane-arrival"></i></div>
                    <h3 style="margin-top: 0;">Климат и локация</h3>
                    <p>Мягкая зима, комфортное лето и близость Балтийского моря делают Калининградскую область лучшим выбором для переезда из суровых климатических зон Сибири и ДВ.</p>
                </div>
            </div>

            <h2 style="text-align: center; margin-bottom: 30px;">Как проходит удаленная покупка квартиры?</h2>
            <div style="max-width: 800px; margin: 0 auto 50px auto; background: var(--white); border-radius: 15px; box-shadow: var(--shadow); padding: 30px;">
                <ol style="margin-left: 20px; line-height: 1.8; font-size: 16px;">
                    <li style="margin-bottom: 15px;"><strong>Бесплатный подбор:</strong> Вы отправляете критерии, мы готовим подборку квартир или домов в Калининграде, Светлогорске, Зеленоградске.</li>
                    <li style="margin-bottom: 15px;"><strong>Видео-показ:</strong> Проводим подробную онлайн-экскурсию по объекту, показываем вид из окна, подъезд и двор.</li>
                    <li style="margin-bottom: 15px;"><strong>Бронирование:</strong> Фиксируем цену и объект за вами.</li>
                    <li style="margin-bottom: 15px;"><strong>Одобрение ипотеки:</strong> Помогаем получить льготную ипотеку от 3.5% дистанционно.</li>
                    <li><strong>Электронная сделка:</strong> Вы подписываете документы в банке вашего города. Мы контролируем процесс здесь.</li>
                </ol>
            </div>

            <div style="text-align: center; margin-top: 60px; margin-bottom: 60px;">
                <h3 style="margin-bottom: 20px;">Готовы обсудить ваш переезд?</h3>
                <a href="index.html#form" class="btn">Получить бесплатную консультацию</a>
            </div>
        </div>
    </section>
"""

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(top_html + content + bottom_html)

print(f"File {out_path} successfully generated from index.html template.")
