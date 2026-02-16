# A-LAB.TECH — Инструкция по запуску Backend

## Шаг 1: Создание проекта в Supabase

1. Перейдите на [supabase.com](https://supabase.com) и создайте бесплатный аккаунт
2. Создайте новый проект (выберите регион ближе к вашим пользователям)
3. Дождитесь инициализации проекта (~2 минуты)

## Шаг 2: Создание таблиц в базе данных

Откройте **SQL Editor** в панели Supabase и выполните следующие запросы:

### Таблица: `projects` (Кейсы для Marketing, Design, R&D)

```sql
create table projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  category text not null check (category in ('marketing', 'design', 'rd')),
  result_value text,
  result_label text,
  description text,
  lang text default 'ru' check (lang in ('ru', 'en')),
  order_index int default 0,
  image_url text,
  link_text text,
  is_locked boolean default false
);

-- Enable Row Level Security
alter table projects enable row level security;

-- Allow public read access
create policy "Allow public read access" on projects
  for select using (true);

-- Allow authenticated users to insert/update
create policy "Allow authenticated insert" on projects
  for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated update" on projects
  for update using (auth.role() = 'authenticated');
```

### Таблица: `residents` (Профили участников)

```sql
create table residents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  full_name text not null,
  role text,
  bio text,
  avatar_url text,
  status text default 'open' check (status in ('open', 'busy', 'away')),
  skills jsonb default '[]'::jsonb,
  links jsonb default '{}'::jsonb
);

alter table residents enable row level security;

-- Users can read all profiles
create policy "Allow public read" on residents
  for select using (true);

-- Users can update their own profile
create policy "Allow users to update own profile" on residents
  for update using (auth.uid() = user_id);

create policy "Allow users to insert own profile" on residents
  for insert with check (auth.uid() = user_id);
```

### Таблица: `posts` (Социальная лента)

```sql
create table posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references residents(user_id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table posts enable row level security;

create policy "Allow public read posts" on posts
  for select using (true);

create policy "Allow users to create posts" on posts
  for insert with check (auth.uid() = author_id);

create policy "Allow users to delete own posts" on posts
  for delete using (auth.uid() = author_id);
```

### Таблица: `leads` (Заявки с форм)

```sql
create table leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  contact text not null,
  source text,
  status text default 'new' check (status in ('new', 'contacted', 'closed')),
  message text
);

alter table leads enable row level security;

-- Only authenticated users can read leads
create policy "Allow authenticated read leads" on leads
  for select using (auth.role() = 'authenticated');

-- Anyone can submit a lead
create policy "Allow anyone to insert leads" on leads
  for insert with check (true);
```

## Шаг 3: Получение API ключей

1. В панели Supabase перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL** (например: `https://abcdefgh.supabase.co`)
   - **anon public** ключ (длинная строка, начинается с `eyJ...`)

## Шаг 4: Настройка файла `supabase-client.js`

Откройте файл `/Users/johnsky/Desktop/A-lab.tech/supabase-client.js` и замените:

```javascript
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

На ваши реальные значения из Шага 3.

## Шаг 5: Создание первого пользователя (Admin)

1. В Supabase перейдите в **Authentication** → **Users**
2. Нажмите **Add user** → **Create new user**
3. Введите:
   - Email: `admin@a-lab.tech` (или ваш email)
   - Password: придумайте надежный пароль
4. Нажмите **Create user**

## Шаг 6: Тестирование

1. Откройте файл `login.html` в браузере
2. Введите созданные email и пароль
3. Если все настроено правильно, вы будете перенаправлены в `admin.html`

## Шаг 7: Добавление первого проекта

1. В Master Admin перейдите на вкладку **Cases / Projects**
2. Заполните форму:
   - **Title**: E-com Giant
   - **Category**: Marketing
   - **Result Metric**: +214% ROI
   - **Description**: Увеличили конверсию интернет-магазина через AI-персонализацию
3. Нажмите **Sync Case to Web**
4. Откройте `marketing.html` — проект должен отобразиться автоматически!

## Что дальше?

- **Resident Profiles**: Создайте дополнительных пользователей через Authentication и заполните их профили в `resident-admin.html`
- **Social Feed**: Реализуйте публикацию постов через вкладку Feed в Resident Admin
- **Forms Integration**: Подключите формы "Join Lab" к таблице `leads`
- **Telegram Bot**: Настройте webhook для уведомлений о новых заявках

---

## Troubleshooting

### Ошибка: "Backend not connected"
- Проверьте, что вы правильно вставили URL и ключ в `supabase-client.js`
- Откройте консоль браузера (F12) и проверьте наличие ошибок

### Ошибка: "Auth session expired"
- Перелогиньтесь через `login.html`

### Проекты не отображаются на сайте
- Убедитесь, что в таблице `projects` есть записи с правильными значениями `category` и `lang`
- Проверьте консоль браузера на наличие ошибок

---

**Готово! Ваш сайт теперь работает на реальном Backend.**
