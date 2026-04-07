const fs = require('fs');

const formNewTranslationsRu = {
    "step1": "Задача",
    "step2": "Контакт",
    "step3": "Отправка",
    "interest": "// ЧТО ВАС ИНТЕРЕСУЕТ?",
    "name": "Ваше имя *",
    "contact": "Telegram / Email / Телефон *",
    "message_brief_task": "Кратко о задаче",
    "message_brief_project": "Кратко о проекте",
    "submit_btn": "Отправить запрос →",
    "success_title": "Запрос отправлен!"
};

const formNewDigitalRu = {
    "opt1": "🤖 AI Интеграция",
    "opt2": "🌐 Веб-разработка",
    "opt3": "⚙️ CRM / Автоматизация",
    "opt4": "🔍 Тех. аудит",
    "opt5": "👁️ Компьютерное зрение",
    "opt6": "💡 Другое",
    "success_sub": "Наш технический директор свяжется с вами в течение 24 часов."
};

const formNewDesignRu = {
    "opt1": "🎨 Брендинг",
    "opt2": "📱 UI/UX Дизайн",
    "opt3": "🏭 Промышленный дизайн",
    "opt4": "🌐 Веб-дизайн",
    "opt5": "📊 Презентация",
    "opt6": "💡 Другое",
    "success_sub": "Наш арт-директор свяжется с вами в течение 4 часов."
};

const formNewTranslationsEn = {
    "step1": "Task",
    "step2": "Contact",
    "step3": "Send",
    "interest": "// WHAT ARE YOU INTERESTED IN?",
    "name": "Your name *",
    "contact": "Telegram / Email / Phone *",
    "message_brief_task": "Brief task description",
    "message_brief_project": "Brief project description",
    "submit_btn": "Send Request →",
    "success_title": "Request sent!"
};

const formNewDigitalEn = {
    "opt1": "🤖 AI Integration",
    "opt2": "🌐 Web Development",
    "opt3": "⚙️ CRM / Automation",
    "opt4": "🔍 Tech Audit",
    "opt5": "👁️ Computer Vision",
    "opt6": "💡 Other",
    "success_sub": "Our technical director will contact you within 24 hours."
};

const formNewDesignEn = {
    "opt1": "🎨 Branding",
    "opt2": "📱 UI/UX Design",
    "opt3": "🏭 Industrial Design",
    "opt4": "🌐 Web Design",
    "opt5": "📊 Presentation / Pitch",
    "opt6": "💡 Other",
    "success_sub": "Our art director will contact you within 4 hours."
};

function updateLang(file, newData) {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.assign(content, newData);
    fs.writeFileSync(file, JSON.stringify(content, null, 4));
}

try {
    updateLang('/Users/johnsky/Documents/A-lab.tech/lang/ru.json', {
        "form_new": formNewTranslationsRu,
        "form_new_digital": formNewDigitalRu,
        "form_new_design": formNewDesignRu
    });
    
    updateLang('/Users/johnsky/Documents/A-lab.tech/lang/en.json', {
        "form_new": formNewTranslationsEn,
        "form_new_digital": formNewDigitalEn,
        "form_new_design": formNewDesignEn
    });
    console.log('Translations inserted successfully!');
} catch (e) {
    console.error(e);
}
