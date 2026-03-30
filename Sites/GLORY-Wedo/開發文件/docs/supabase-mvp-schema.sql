-- 御之旅 MVP — Supabase 核心資料表（對齊《御之旅 MVP 開發規劃建議書 v2》第四節）
-- 於 Supabase Dashboard → SQL Editor 執行

-- ① 使用者（Auth 自動建 auth.users；此為擴充資料）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ② 行程草稿
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id UUID REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT,
  days_json JSONB NOT NULL,
  tags TEXT[],
  share_token TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ③ 報價單
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  trip_id UUID REFERENCES public.trips (id) ON DELETE CASCADE,
  pax INTEGER,
  cost_json JSONB,
  markup_pct NUMERIC(5, 2) DEFAULT 10,
  fx_rate NUMERIC(8, 4) DEFAULT 0.22,
  total_jpy NUMERIC(12, 0),
  total_twd NUMERIC(12, 0),
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ④ 訂房記錄
CREATE TABLE public.bookings (
  id SERIAL PRIMARY KEY,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER,
  guests INTEGER,
  floor TEXT,
  rooms_json JSONB,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⑤ Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own trips" ON public.trips
  FOR ALL USING (auth.uid () = user_id);

CREATE POLICY "share token readable by anyone" ON public.trips
  FOR SELECT USING (share_token IS NOT NULL);
