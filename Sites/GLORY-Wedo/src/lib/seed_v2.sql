-- 御之旅 (Royal Journey) 歷史樣本與資源 Seed (V2)
-- 基於《高爾夫旅遊6團資料統整》

-- 1. 導入 6 團基本資訊
INSERT INTO tours (tour_name, days, nights, pax, golf_pax, status)
VALUES 
('張振棟世華哥團', 10, 9, 15, 15, 'completed'),
('蘇國棟高爾夫假期', 7, 6, 15, 15, 'completed'),
('郭銘勳高爾夫之旅', 6, 5, 10, 10, 'completed'),
('馬吉隊名門高爾夫', 6, 5, 9, 8, 'completed'),
('彥廷高爾夫小團', 6, 5, 4, 4, 'completed'),
('悠活北海道大團', 6, 5, 21, 21, 'completed');

-- 2. 導入 14 座球場資訊 (部分範例，對應 Excel 球場資訊)
INSERT INTO golf_courses (name_zh, location, green_fee, tier)
VALUES 
('由仁東武 GC', '千歲', 15000, 'B'),
('Nidom Classic GC', '苫小牧', 25000, 'A'),
('一達國際私人 GC', '北廣島', 18000, 'A'),
('桂 GC', '苫小牧', 30000, 'A'),
('HANAZONO GC', '俱知安', 16000, 'B'),
('Happy Valley GC', '石狩', 12000, 'C'),
('Sapporo Bay GC', '石狩', 14000, 'B'),
('北廣島 GC', '北廣島', 13000, 'B'),
('太陽之里 GC', '夕張', 11000, 'C'),
('真駒內 CC', '札幌', 15000, 'B');

-- 3. 導入飯店資訊 (依照 住宿資訊 表)
INSERT INTO hotels (name_zh, location, price_single_jpy, price_double_jpy, tier)
VALUES 
('北廣島 Classe Hotel', '北廣島', 18000, 14000, 'B'),
('札幌全日空皇冠假日', '札幌', 25000, 18000, 'A'),
('支笏湖 第一鶴雅', '支笏湖', 45000, 35000, 'A'),
('星野渡假村 Tomamu', '占冠', 35000, 25000, 'A'),
('宜必思尚品 札幌', '札幌', 12000, 9000, 'C');

-- 4. 導入交通規費
INSERT INTO staff_costs (staff_type, daily_rate_jpy, accommodation_allowance_jpy)
VALUES 
('導遊', 30000, 10000),
('司機', 25000, 8000);
