-- 御之旅 (Royal Journey) 核心資源與成本資料表 (V2 - 2026/03/30 更新)
-- 完全對應《高爾夫旅遊6團資料統整》系統開發參考之 13 類欄位

-- 1. 團基本資訊 (Tours)
CREATE TABLE IF NOT EXISTS tours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_name TEXT NOT NULL,
    days INTEGER NOT NULL,
    nights INTEGER NOT NULL,
    pax INTEGER NOT NULL,
    golf_pax INTEGER DEFAULT 0,
    tour_pax INTEGER DEFAULT 0, -- 純旅遊人數
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'draft', -- draft, quoted, confirmed, completed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 高爾夫球場 (Golf Courses)
CREATE TABLE IF NOT EXISTS golf_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_zh TEXT NOT NULL,
    name_en TEXT,
    location TEXT, -- 札幌, 北廣島, 千歲 等區域
    green_fee INTEGER, -- JPY
    tee_time TIME,
    capacity INTEGER DEFAULT 0, -- 容納人數上限
    booking_status TEXT, -- 可預約, 已滿, 待確認
    tier TEXT CHECK (tier IN ('A', 'B', 'C')),
    google_maps_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 住宿資源 (Hotels)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_zh TEXT NOT NULL,
    location TEXT,
    price_single_jpy INTEGER,
    price_double_jpy INTEGER,
    tier TEXT CHECK (tier IN ('A', 'B', 'C')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 餐飲資源 (Restaurants)
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_zh TEXT NOT NULL,
    meal_type TEXT, -- 燒肉, 懷石, 居酒屋 等
    estimated_cost_per_pax INTEGER, -- JPY
    location_tag TEXT,
    google_maps_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 交通車隊 (Transport Fleet)
CREATE TABLE IF NOT EXISTS transport_fleet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_type TEXT NOT NULL, -- ALPHARD, HIACE, Coaster, MediumBus, LargeBus
    max_pax INTEGER NOT NULL,
    max_bags INTEGER NOT NULL,
    max_golf_bags INTEGER NOT NULL,
    daily_rate_jpy INTEGER, -- 日租金
    overtime_rate_jpy INTEGER, -- 超時費/小時
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 導遊與司機成本 (Guide & Driver)
CREATE TABLE IF NOT EXISTS staff_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_type TEXT, -- 導遊, 司機
    daily_rate_jpy INTEGER,
    accommodation_allowance_jpy INTEGER, -- 住宿補貼
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 團員資料 (Tour Members)
CREATE TABLE IF NOT EXISTS tour_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID REFERENCES tours(id),
    name_zh TEXT NOT NULL,
    name_en TEXT,
    gender TEXT,
    flight_code TEXT,
    room_type TEXT, -- Single, Double
    room_number TEXT,
    group_type TEXT, -- Golf, Tour
    dietary_restriction TEXT,
    payment_status BOOLEAN DEFAULT false,
    arrival_date DATE,
    departure_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 每日行程 (Daily Plans)
CREATE TABLE IF NOT EXISTS daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID REFERENCES tours(id),
    day_number INTEGER NOT NULL,
    date DATE,
    morning_activity TEXT,
    afternoon_activity TEXT,
    golf_course_id UUID REFERENCES golf_courses(id),
    hotel_id UUID REFERENCES hotels(id),
    dinner_id UUID REFERENCES restaurants(id),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. 成本與報價 (Quotations)
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID REFERENCES tours(id),
    subtotal_cost_jpy INTEGER,
    markup_rate DECIMAL(3, 2) DEFAULT 1.1,
    referral_fee_twd INTEGER DEFAULT 0,
    exchange_rate DECIMAL(10, 4) DEFAULT 0.22, -- JPY to TWD
    quote_single_twd INTEGER,
    quote_double_twd INTEGER,
    final_total_twd INTEGER,
    rounding_rule TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. 航班資量 (Flights)
CREATE TABLE IF NOT EXISTS flights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_code TEXT NOT NULL,
    airline TEXT,
    direction TEXT, -- Inbound, Outbound
    departure_time TIME,
    arrival_time TIME,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 初始交通資料 (依照 統整表：交通方式)
INSERT INTO transport_fleet (vehicle_type, max_pax, max_bags, max_golf_bags, daily_rate_jpy)
VALUES 
('ALPHARD', 4, 4, 0, 60000),
('HIACE', 9, 9, 8, 70000),
('Commuter', 12, 12, 10, 80000),
('Coaster', 18, 18, 15, 90000),
('MediumBus', 27, 27, 20, 110000),
('LargeBus', 40, 40, 40, 130000);
