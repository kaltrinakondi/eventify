# Eventify — Full Event Platform (Supabase)

Modern event management platform powered by **Supabase Auth + PostgreSQL**. No Node.js server required.

## Features

- **Auth:** Sign up, login, logout, password reset, persistent sessions
- **Events:** Create, edit, delete, search, filter, sort
- **RSVP:** Going / Maybe / Not Going
- **Favorites:** Save events to your list
- **Dashboard:** Profile, My Events, RSVPs, Favorites
- **Reviews & ratings** on event details
- **15 event categories** with icons
- **Image uploads** via Supabase Storage

## Setup

### 1. Supabase SQL
Run `database/supabase.sql` in **SQL Editor**

### 2. Auth settings
**Authentication → Providers → Email** → disable "Confirm email" for testing

### 3. Anon key
Copy from **Project Settings → API** into `js/supabase-config.js`:

```js
const SUPABASE_ANON_KEY = 'eyJ...';
```

### 4. Run locally
```powershell
cd C:\Users\DELL\Projects\eventify
py -m http.server 5500
```
Open http://localhost:5500

## Pages

| Page | Description |
|------|-------------|
| index.html | Home, categories, featured events |
| events.html | Browse, search, filter, sort |
| event.html | Event details, RSVP, reviews, map |
| create-event.html | Create / edit events |
| dashboard.html | User dashboard |
| my-events.html | Events you created |
| my-rsvps.html | Events you RSVP'd to |
| favorites.html | Saved events |
| login.html / register.html | Auth |
| forgot-password.html / reset-password.html | Password reset |
| calendar.html | Calendar view |
| admin.html | Admin panel |

## Make yourself admin
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```
