-- 導入 4 團歷史樣本初始資料
-- 基於開發文件/高爾夫旅遊文件之目錄結構

INSERT INTO historical_samples (group_name, pax, days, itinerary_data_json, raw_document_url)
VALUES 
(
    '郭銘勳 6天5夜3場球', 
    10, 
    6, 
    '{"title": "郭銘勳高爾夫假期", "golf_rounds": 3, "nights": 5}', 
    '開發文件/高爾夫旅遊文件/郭銘勳6天5夜3場球_10人/郭銘勳6天5夜3場球_10人.pdf'
),
(
    '馬吉隊 6天5夜3場球', 
    9, 
    6, 
    '{"title": "名門高爾夫假期", "golf_rounds": 3, "nights": 5, "note": "8+1人"}', 
    '開發文件/高爾夫旅遊文件/馬吉隊6天5夜3場球_8+1人/5.12~5.16名門高爾夫假期.pdf'
),
(
    '蘇國棟 7天6夜4場球', 
    15, 
    7, 
    '{"title": "蘇國棟高爾夫假期", "golf_rounds": 4, "nights": 6}', 
    '開發文件/高爾夫旅遊文件/蘇國棟7天6夜4場球_15人/蘇國棟7天6夜4場球_15人.pdf'
),
(
    '彥廷 6天5夜3場球', 
    1, -- 待補齊人數
    6, 
    '{"title": "彥廷高爾夫之旅", "golf_rounds": 3, "nights": 5}', 
    '開發文件/高爾夫旅遊文件/彥廷6天5夜3場球/彥廷6天5夜3場球.pdf'
);

-- 導入資源台帳初始資料 (範例)
INSERT INTO golf_courses (name_zh, tier, base_price_weekday)
VALUES 
('由仁東武 GC', 'B', 15000),
('Nidom Classic GC', 'A', 17000),
('一達國際私人 GC', 'A', 10000),
('桂 GC', 'A', 30000),
('HANAZONO GC', 'B', 15000);
