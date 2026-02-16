const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lvyfuljsvzczuwccktln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWZ1bGpzdnpjenV3Y2NrdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTAwMzEsImV4cCI6MjA4NjU2NjAzMX0.juafzih9bbcIsntrAvku2O_77yz7mnIkOqbY8xencIo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const designProjects = [
    // Vanguard Techwear
    {
        title: "Vanguard Techwear",
        result_value: "IDENTITY",
        result_label: "FASHION",
        description: "Creating a futuristic identity and visual communication system for a techwear apparel brand.",
        category: "design",
        lang: "en",
        image_url: "https://lvyfuljsvzczuwccktln.supabase.co/storage/v1/object/public/portfolio/design_case_vanguard.png",
        order_index: 1
    },
    {
        title: "Vanguard Techwear",
        result_value: "IDENTITY",
        result_label: "FASHION",
        description: "Создание футуристичной айдентики и системы визуальных коммуникаций для бренда технологичной одежды.",
        category: "design",
        lang: "ru",
        image_url: "https://lvyfuljsvzczuwccktln.supabase.co/storage/v1/object/public/portfolio/design_case_vanguard.png",
        order_index: 1
    },
    // Nebula Digital Bank
    {
        title: "Nebula Digital Bank",
        result_value: "BRANDING",
        result_label: "CRYPTO",
        description: "Designing the world's first decentralized banking identity, merging complex blockchain aesthetics with high-end fintech reliability.",
        category: "design",
        lang: "en",
        image_url: "https://lvyfuljsvzczuwccktln.supabase.co/storage/v1/object/public/portfolio/design_case_nebula.png",
        order_index: 2
    },
    {
        title: "Nebula Digital Bank",
        result_value: "BRANDING",
        result_label: "CRYPTO",
        description: "Создание визуальной идентичности первого децентрализованного банка, объединяющей эстетику блокчейна с доверием мирового финтеха.",
        category: "design",
        lang: "ru",
        image_url: "https://lvyfuljsvzczuwccktln.supabase.co/storage/v1/object/public/portfolio/design_case_nebula.png",
        order_index: 2
    },
    // Aura Blockchain Consortium
    {
        title: "Aura Blockchain Consortium",
        result_value: "TRACEABILITY",
        result_label: "WEB3 & LUXURY",
        description: "Developing the digital backbone for the world’s leading luxury groups (LVMH, Prada, Cartier), ensuring authenticity and product lifecycle transparency via private blockchain.",
        category: "design",
        lang: "en",
        image_url: "https://lvyfuljsvzczuwccktln.supabase.co/storage/v1/object/public/portfolio/design_case_aura_blockchain.png",
        order_index: 3
    },
    {
        title: "Aura Blockchain Consortium",
        result_value: "WEB3 / LUXURY",
        result_label: "AUTHENTICITY",
        description: "Разработка технологического ядра для крупнейших мировых люкс-групп (LVMH, Prada, Cartier), обеспечивающего прозрачность жизненного цикла товаров через приватный блокчейн.",
        category: "design",
        lang: "ru",
        image_url: "https://lvyfuljsvzczuwccktln.supabase.co/storage/v1/object/public/portfolio/design_case_aura_blockchain.png",
        order_index: 3
    },
    // Neural Health OS
    {
        title: "Neural Health OS",
        result_value: "OPERATING SYSTEM",
        result_label: "MEDICINE",
        description: "Designing a comprehensive OS interface for real-time brain activity monitoring and AI-driven neural diagnostics.",
        category: "design",
        lang: "en",
        image_url: "https://lvyfuljsvzczuwccktln.supabase.co/storage/v1/object/public/portfolio/design_case_med_v3.png",
        order_index: 4
    },
    {
        title: "Neural Health OS",
        result_value: "SYSTEM INTERFACE",
        result_label: "MEDICAL_OS",
        description: "Разработка комплексного интерфейса операционной системы для мониторинга активности мозга и нейро-диагностики в реальном времени.",
        category: "design",
        lang: "ru",
        image_url: "https://lvyfuljsvzczuwccktln.supabase.co/storage/v1/object/public/portfolio/design_case_med_v3.png",
        order_index: 4
    }
];

async function seed() {
    console.log('Cleaning up existing design projects...');
    await supabase.from('projects').delete().eq('category', 'design');

    console.log('Inserting new design projects...');
    const { data, error } = await supabase.from('projects').insert(designProjects);

    if (error) {
        console.error('Error seeding data:', error);
    } else {
        console.log('Design projects successfully seeded to Supabase!');
    }
}

seed();
