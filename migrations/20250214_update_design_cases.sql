-- 1. Добавление колонки link_url, если её нет
ALTER TABLE projects ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 2. Очистка существующих данных
TRUNCATE TABLE projects;

-- 3. Вставка данных
INSERT INTO projects (title, result_value, result_label, description, category, lang, image_url, order_index, link_url)
VALUES 
-- MARKETING (RU)
('E-com Giant', '+214', 'ROI', 'Внедрение ИИ-рекомендаций и автоматического ретаргетинга.', 'marketing', 'ru', NULL, 1, 'marketing_ecom.html'),
('SaaS Platform', '-40', 'CAC', 'Оптимизация воронки через предиктивный скоринг лидов.', 'marketing', 'ru', NULL, 2, 'marketing_saas.html'),
('Global Brand', '1.5M', 'Reach', 'Виральная кампания с использованием нейросетевых фильтров.', 'marketing', 'ru', NULL, 3, 'marketing_global.html'),

-- DESIGN (EN)
('Vanguard Techwear', 'IDENTITY', 'FASHION', 'Creating a futuristic identity and visual communication system for a techwear apparel brand.', 'design', 'en', 'design_case_vanguard.png', 1, 'project_vanguard.html'),
('Nebula Digital Bank', 'BRANDING', 'CRYPTO', 'Designing the world’s first decentralized banking identity, merging complex blockchain aesthetics with high-end fintech reliability.', 'design', 'en', 'design_case_nebula.png', 2, 'project_nebula.html'),
('Aura Blockchain Consortium', 'TRACEABILITY', 'WEB3 & LUXURY', 'Developing the digital backbone for the world’s leading luxury groups (LVMH, Prada, Cartier), ensuring authenticity and product lifecycle transparency via private blockchain.', 'design', 'en', 'design_case_aura_blockchain.png', 3, 'project_aura.html'),
('Neural Health OS', 'OPERATING SYSTEM', 'MEDICINE', 'Designing a comprehensive OS interface for real-time brain activity monitoring and AI-driven neural diagnostics.', 'design', 'en', 'design_case_med_v3.png', 4, 'project_neural.html'),

-- DESIGN (RU)
('Vanguard Techwear', 'IDENTITY', 'FASHION', 'Создание футуристичной айдентики и системы визуальных коммуникаций для бренда технологичной одежды.', 'design', 'ru', 'design_case_vanguard.png', 1, 'project_vanguard.html'),
('Nebula Digital Bank', 'BRANDING', 'CRYPTO', 'Создание визуальной идентичности первого децентрализованного банка, объединяющей эстетику блокчейна с доверием мирового финтеха.', 'design', 'ru', 'design_case_nebula.png', 2, 'project_nebula.html'),
('Aura Blockchain Consortium', 'WEB3 / LUXURY', 'AUTHENTICITY', 'Разработка технологического ядра для крупнейших мировых люкс-групп (LVMH, Prada, Cartier), обеспечивающего прозрачность жизненного цикла товаров через приватный блокчейн.', 'design', 'ru', 'design_case_aura_blockchain.png', 3, 'project_aura.html'),
('Neural Health OS', 'SYSTEM INTERFACE', 'MEDICAL_OS', 'Разработка комплексного интерфейса операционной системы для мониторинга активности мозга и нейро-диагностики в реальном времени.', 'design', 'ru', 'design_case_med_v3.png', 4, 'project_neural.html'),

-- R&D (RU)
('Lumina AI Framework', 'OPEN_SOURCE', 'tag-open', 'Ультра-быстрая библиотека для визуализации работы нейросетей.', 'rd', 'ru', 'rd_lumina_ai.png', 1, NULL),
('Project Matrix', 'CONFIDENTIAL', 'tag-closed', 'Система визуализации нейронных связей сообщества.', 'rd', 'ru', 'rd_project_matrix.png', 2, NULL);

