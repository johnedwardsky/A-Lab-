# A-LAB.TECH Database Schema (Supabase / PostgreSQL)

## Table: `projects`
Stores case studies and projects for Marketing, Design, and R&D pages.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid (PK) | Unique identifier |
| `created_at` | timestamp | Creation time |
| `title` | text | Project title (e.g., "E-com Giant") |
| `result_value` | text | Impact metric (e.g., "+214%", "1.5M") |
| `result_label` | text | Impact label (e.g., "ROI", "Reach", "CAC") |
| `description` | text | Short description of the work |
| `category` | text | Page location: `marketing`, `design`, `rd` |
| `lang` | text | Language: `ru`, `en` |
| `order_index` | int | Sorting weight |
| `image_url` | text | (Optional) Image link |

## Table: `residents`
Stores profile data for the community.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid (PK) | Unique identifier |
| `user_id` | uuid (FK) | Link to Auth user |
| `full_name` | text | Display name |
| `role` | text | Professional role |
| `bio` | text | Fragment / Biography |
| `avatar_url` | text | Profile image |
| `status` | text | `open`, `busy`, `away` |
| `skills` | jsonb | Array of tags: `["AI", "UI"]` |
| `links` | jsonb | Social links: `{"github": "...", "tg": "..."}` |

## Table: `posts`
Social feed entries.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid (PK) | Unique identifier |
| `author_id` | uuid (FK) | Link to `residents` |
| `content` | text | Post text |
| `created_at` | timestamp | Publication time |

## Table: `leads`
Form submissions from "Join Lab" and service pages.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid (PK) | Unique identifier |
| `name` | text | Contact name |
| `contact` | text | TG username / Email |
| `source` | text | Page where form was sent from |
| `status` | text | `new`, `contacted`, `closed` |
