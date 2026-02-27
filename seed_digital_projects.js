const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lvyfuljsvzczuwccktln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWZ1bGpzdnpjenV3Y2NrdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTAwMzEsImV4cCI6MjA4NjU2NjAzMX0.juafzih9bbcIsntrAvku2O_77yz7mnIkOqbY8xencIo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const digitalProjects = [
    // --- DIGITAL CATEGORY (RU) ---
    {
        title: "Lumina AI Support",
        result_value: "85%",
        result_label: "Automation",
        description: "Интеграция LLM-ассистента в поддержку крупного маркетплейса. 85% ответов без участия человека.",
        category: "digital",
        lang: "ru",
        image_url: "rd_lumina_ai.png",
        order_index: 1
    },
    {
        title: "Supply Chain Predictor",
        result_value: "-22%",
        result_label: "Lead Time",
        description: "Нейросетевая модель прогнозирования спроса и оптимизации складских запасов.",
        category: "digital",
        lang: "ru",
        image_url: "rd_industrial.png",
        order_index: 2
    },
    {
        title: "Defi Vault Shield",
        result_value: "SECURE",
        result_label: "10+ AUDITS",
        description: "Разработка смарт-контрактов для DeFi-протокола с автоматизированным управлением рисками.",
        category: "digital",
        lang: "ru",
        image_url: "case_fintech.png",
        order_index: 3
    },
    {
        title: "VisionScan Pro",
        result_value: "0.1s",
        result_label: "Latency",
        description: "Высокопроизводительный SDK для распознавания лиц и биометрической аутентификации.",
        category: "digital",
        lang: "ru",
        image_url: "rd_ai_tech.png",
        order_index: 4
    },
    {
        title: "LegalVoice AI",
        result_value: "99.8%",
        result_label: "Accuracy",
        description: "Специализированный транскрибатор для юристов: распознавание речи в судах с автоматическим выделением терминов и статей кодекса.",
        category: "digital",
        lang: "ru",
        image_url: "case_luxury.png",
        order_index: 5
    },
    {
        title: "SalesFlow CRM",
        result_value: "+42%",
        result_label: "Efficiency",
        description: "Интеллектуальная CRM-экосистема: предиктивный скоринг лидов, авто-генерация офферов и AI-трекинг продуктивности отдела продаж.",
        category: "digital",
        lang: "ru",
        image_url: "case_luxury_retail.png",
        order_index: 6
    },
    // --- DIGITAL CATEGORY (EN) ---
    {
        title: "Lumina AI Support",
        result_value: "85%",
        result_label: "Automation",
        description: "LLM assistant integration for a major marketplace. 85% of queries managed without humans.",
        category: "digital",
        lang: "en",
        image_url: "rd_lumina_ai.png",
        order_index: 1
    },
    {
        title: "Supply Chain Predictor",
        result_value: "-22%",
        result_label: "Lead Time",
        description: "Neural network model for demand forecasting and inventory optimization.",
        category: "digital",
        lang: "en",
        image_url: "rd_industrial.png",
        order_index: 2
    },
    {
        title: "Defi Vault Shield",
        result_value: "SECURE",
        result_label: "10+ AUDITS",
        description: "Smart contract development for a DeFi protocol with automated risk management.",
        category: "digital",
        lang: "en",
        image_url: "case_fintech.png",
        order_index: 3
    },
    {
        title: "VisionScan Pro",
        result_value: "0.1s",
        result_label: "Latency",
        description: "High-performance SDK for facial recognition and biometric authentication.",
        category: "digital",
        lang: "en",
        image_url: "rd_ai_tech.png",
        order_index: 4
    },
    {
        title: "LegalVoice AI",
        result_value: "99.8%",
        result_label: "Accuracy",
        description: "Specialized legal transcriber: court speech recognition with automated terminology and legal citation extraction.",
        category: "digital",
        lang: "en",
        image_url: "case_luxury.png",
        order_index: 5
    },
    {
        title: "SalesFlow CRM",
        result_value: "+42%",
        result_label: "Efficiency",
        description: "Intelligent CRM ecosystem: predictive lead scoring, automated offer generation, and AI-driven sales team productivity tracking.",
        category: "digital",
        lang: "en",
        image_url: "case_luxury_retail.png",
        order_index: 6
    }
];

async function seed() {
    console.log('Cleaning up existing digital projects...');
    await supabase.from('projects').delete().eq('category', 'digital');

    console.log('Inserting new digital projects...');
    const { data, error } = await supabase.from('projects').insert(digitalProjects);

    if (error) {
        console.error('Error seeding digital data:', error);
    } else {
        console.log('Digital projects successfully seeded to Supabase!');
    }
}

seed();
