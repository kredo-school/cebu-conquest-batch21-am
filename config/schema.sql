-- =====================================================================
-- 1. 制約の一時無効化と古いテーブルの完全削除
-- =====================================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS match_results;
DROP TABLE IF EXISTS occupations;
DROP TABLE IF EXISTS user_items;
DROP TABLE IF EXISTS room_players;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS gods;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS spots;
DROP TABLE IF EXISTS areas;
DROP TABLE IF EXISTS islands;
-- DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 2. テーブルの新規作成 (最新設計図)
-- =====================================================================
CREATE TABLE islands (
    id INT PRIMARY KEY, 
    name VARCHAR(100) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE areas (
    id INT PRIMARY KEY,
    island_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (island_id) REFERENCES islands (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- CREATE TABLE users (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     username VARCHAR(50) NOT NULL UNIQUE,
--     password VARCHAR(255) DEFAULT 'dummy_pass',
--     security_question VARCHAR(255) NOT NULL,
--     security_answer VARCHAR(255) NOT NULL,
--     player_color VARCHAR(20) DEFAULT '#3498db',
--     max_hp INT DEFAULT 100,
--     current_hp INT DEFAULT 100,
--     stamina INT DEFAULT 100,
--     atk INT DEFAULT 100,
--     def INT DEFAULT 100,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_key VARCHAR(10) UNIQUE NOT NULL,
    host_user_id INT NOT NULL,
    guest_user_id INT DEFAULT NULL,
    status ENUM ('waiting', 'playing', 'finished') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (guest_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE room_players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE spots (
    id INT PRIMARY KEY,
    island_id INT NOT NULL,
    area_id INT NOT NULL,
    district_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    map_x FLOAT NULL,
    map_y FLOAT NULL,
    capture_cost INT DEFAULT 10,
    drop_item_id INT NULL,
    FOREIGN KEY (area_id) REFERENCES areas (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE items (
    id INT PRIMARY KEY,
    spot_id INT NULL,
    name VARCHAR(100) NOT NULL,
    buff_target VARCHAR(50),
    buff_type VARCHAR(50),
    buff_value INT,
    description TEXT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE gods (
    id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    district_id INT NOT NULL,
    spot_id INT NOT NULL,
    special_effect VARCHAR(255),
    image_url VARCHAR(255),
    description VARCHAR(255)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE occupations (
    spot_id INT PRIMARY KEY,
    user_id INT,
    room_key VARCHAR(10) NOT NULL,
    occupied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (spot_id) REFERENCES spots (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE user_items (
    user_id INT,
    item_id INT,
    quantity INT DEFAULT 1,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE match_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    score INT DEFAULT 0,
    spots_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- インデックス作成
CREATE INDEX idx_room_key ON occupations (room_key);


-- =====================================================================
-- 3. マスタデータの投入 (Islands & Areas)
-- =====================================================================
INSERT INTO islands (id, name) VALUES
(1000, 'Cebu・Mactan'),
(2000, 'Negros'),
(3000, 'Bohol');

INSERT INTO areas (island_id, id, name) VALUES
(1000, 11, 'North: Azure Coast'),
(1000, 12, 'Central-North: Industrial Ridge'),
(1000, 13, 'Core: Metro Cebu Dominance'),
(1000, 14, 'Central-South: Heritage Corridor'),
(1000, 15, 'South: Adventure Peak'),
(1000, 16, 'Mactan: Gateway & Resort'),
(2000, 21, 'North:Sugar Coast'),
(2000, 22, 'West: Metro Bacolod Hub'),
(2000, 23, 'East: Canlaon Frontier'),
(2000, 24, 'South: Mystic Dumaguete'),
(3000, 31, 'North: Marine Frontier'),
(3000, 32, 'Center: Chocolate Hills Sanctuary'),
(3000, 33, 'South: Panglao Gateway');


-- =====================================================================
-- 4. マスタデータの投入 (Spots)
-- =====================================================================
-- =====================================================================
-- 4. マスタデータの投入 (Spots) - 座標を完全に削除（すべてNULL）に修正
-- =====================================================================
INSERT INTO spots (island_id, area_id, district_id, id, name, map_x, map_y, capture_cost, drop_item_id) VALUES
-- Cebu・Mactan (1000)
(1000, 11, 111, 11101, 'Maya Port', NULL, NULL, 15, 111011),
(1000, 11, 111, 11102, 'Dawnhill House', NULL, NULL, 10, NULL),
(1000, 11, 112, 11201, 'Sugarcane Field', NULL, NULL, 10, 112011),
(1000, 11, 112, 11202, 'Farmar House', NULL, NULL, 10, NULL),
(1000, 11, 113, 11301, 'Bogo Transit Terminal', NULL, NULL, 10, NULL),
(1000, 11, 113, 11302, 'Bogo Hilltop Shrine', NULL, NULL, 10, NULL),
(1000, 11, 113, 11303, 'Golden Eye Tower', NULL, NULL, 10, NULL),
(1000, 11, 113, 11304, 'Golden Eye Tower', NULL, NULL, 10, NULL),
(1000, 11, 113, 11305, 'Golden Wheat Hamlet', NULL, NULL, 10, NULL),
(1000, 11, 113, 11306, 'Shattered Beacon', NULL, NULL, 10, NULL),
(1000, 11, 113, 11307, 'Bogo North Mountain', NULL, NULL, 10, NULL),
(1000, 12, 121, 12101, 'Cebu Safari Fortress', NULL, NULL, 10, NULL),
(1000, 12, 121, 12102, 'Uragay West UG', NULL, NULL, 10, NULL),
(1000, 12, 121, 12103, 'Uragay East UG', NULL, NULL, 10, NULL),
(1000, 12, 121, 12104, 'Uragay Spring Sanctuary', NULL, NULL, 10, NULL),
(1000, 12, 121, 12105, 'Lolo''s Farm Hut', NULL, NULL, 10, NULL),
(1000, 12, 122, 12201, 'The Iron Port', NULL, NULL, 10, NULL),
(1000, 12, 122, 12202, 'Danao Gunsmith Alley', NULL, NULL, 10, NULL),
(1000, 12, 122, 12203, 'Nao''s House', NULL, NULL, 50, 122031),
(1000, 12, 122, 12204, 'Aki''s House', NULL, NULL, 50, 122041),
(1000, 12, 122, 12205, 'Kei''s House', NULL, NULL, 50, 122051),
(1000, 12, 122, 12206, 'Issei''s House', NULL, NULL, 50, 122061),
(1000, 12, 123, 12301, 'Q-Park Giant Statue', NULL, NULL, 10, NULL),
(1000, 12, 123, 12302, 'Gatekeeper''s Quarry', NULL, NULL, 10, NULL),
(1000, 13, 131, 13101, 'IT Park', NULL, NULL, 10, 131011), -- ★NULLに修正
(1000, 13, 131, 13102, 'Waterfront Hotel', NULL, NULL, 20, 131021),
(1000, 13, 131, 13103, 'Ayala Malls Center', NULL, NULL, 10, 131031),
(1000, 13, 132, 13201, 'Magellan''s Cross', NULL, NULL, 15, 132011), -- ★NULLに修正
(1000, 13, 132, 13202, 'Fort San Pedro', NULL, NULL, 20, 132021), -- ★NULLに修正
(1000, 13, 132, 13203, 'Carbon Market', NULL, NULL, 15, 132031), -- ★NULLに修正
(1000, 13, 132, 13204, 'BASILICA del SANTO NINO ', NULL, NULL, 30, 132041),
(1000, 13, 133, 13302, 'Marcelo Fernan Bridge', NULL, NULL, 20, 133021),
(1000, 13, 133, 13303, 'Vermillion Cargo Vault', NULL, NULL, 25, 133031),
(1000, 13, 134, 13401, 'Talisay Lechon Stalls', NULL, NULL, 20, 134011),
(1000, 13, 134, 13402, 'Talisay Landing Marker', NULL, NULL, 20, 134021),
(1000, 14, 141, 14101, 'Luminous Power Spire', NULL, NULL, 30, 141011),
(1000, 14, 141, 14102, 'Starlight Boardwalk', NULL, NULL, 20, 141021),
(1000, 14, 142, 14201, 'Ancient Meat Fortress', NULL, NULL, 15, 142011),
(1000, 14, 142, 14202, 'Heritage Ancestral Houses', NULL, NULL, 20, 142021),
(1000, 14, 143, 14301, 'The Torta Sanctuary', NULL, NULL, 25, 143011),
(1000, 14, 143, 14302, 'Argao Stone Gate', NULL, NULL, 30, 143021),
(1000, 14, 143, 14303, 'Fisherman''s Salt Cabin', NULL, NULL, 25, 143031),
(1000, 15, 151, 15101, 'Moalboal Diver''s Haven', NULL, NULL, 20, 151011),
(1000, 15, 151, 15102, 'Kawasan Falls Sanctuary', NULL, NULL, 30, 151021),
(1000, 15, 151, 15103, 'Bahay Kubo Shelter', NULL, NULL, 15, 151031),
(1000, 15, 151, 15104, 'Panagsama Fisher''s Shack', NULL, NULL, 20, 151041),
(1000, 15, 152, 15201, 'Osmeña Apex', NULL, NULL, 20, 152011), -- ★NULLに修正
(1000, 15, 152, 15202, 'Nipa Rest House', NULL, NULL, 15, 152021),
(1000, 15, 152, 15203, 'Tindalo Boarding House', NULL, NULL, 15, 152031),
(1000, 15, 153, 15301, 'Whale Shark Cove', NULL, NULL, 30, 153011),
(1000, 15, 153, 15302, 'Cuartel Ruins', NULL, NULL, 25, 153021),
(1000, 15, 153, 15303, 'Rust-Brick Tool House', NULL, NULL, 15, 153031),
(1000, 16, 161, 16101, 'Mactan Shrine', NULL, NULL, 25, 161011),
(1000, 16, 161, 16102, 'The Discovery Galleon', NULL, NULL, 20, 161021),
(1000, 16, 161, 16103, 'Resort Hotel', NULL, NULL, 15, 161031),
(1000, 16, 162, 16201, 'MCIA', NULL, NULL, 40, 162021),

-- Negros (2000)
(2000, 21, 211, 21101, 'Victorias Milling Company', NULL, NULL, 20, 211011),
(2000, 21, 211, 21102, 'Sagay Sugar Locomotive', NULL, NULL, 10, NULL),
(2000, 21, 212, 21201, 'Cadiz City Port', NULL, NULL, 10, NULL),
(2000, 22, 221, 22101, 'Balay Negrense', NULL, NULL, 10, NULL),
(2000, 22, 221, 22102, 'Company Station', NULL, NULL, 10, NULL),
(2000, 22, 221, 22103, 'Silay Town', NULL, NULL, 10, NULL),
(2000, 22, 222, 22201, 'MassKara Plaza', NULL, NULL, 10, NULL),
(2000, 22, 222, 22202, 'Manokan Country', NULL, NULL, 10, NULL),
(2000, 23, 231, 23101, 'Mt. Kanlaon Volcano', NULL, NULL, 30, 231011),
(2000, 23, 231, 23102, 'Highland Vegetable Terraces', NULL, NULL, 10, NULL),
(2000, 23, 232, 23201, 'San Carlos Port', NULL, NULL, 10, NULL),
(2000, 23, 232, 23202, 'SaCaSol Solar Farm', NULL, NULL, 10, NULL),
(2000, 23, 232, 23203, 'Mayana Peak', NULL, NULL, 10, NULL),
(2000, 23, 232, 23204, 'Old Lantern Storage', NULL, NULL, 10, NULL),
(2000, 24, 241, 24101, 'Gym-Silliman University', NULL, NULL, 10, NULL),
(2000, 24, 241, 24102, 'Silliman University Church', NULL, NULL, 10, NULL),
(2000, 24, 241, 24103, 'Faculty of Law', NULL, NULL, 10, NULL),
(2000, 24, 241, 24104, 'Faculty of Computer Science', NULL, NULL, 10, NULL),
(2000, 24, 241, 24105, 'Faculty of Economics', NULL, NULL, 10, NULL),
(2000, 24, 241, 24106, 'Faculty of Commerce', NULL, NULL, 10, NULL),
(2000, 24, 241, 24107, 'Faculty of Education', NULL, NULL, 10, NULL),
(2000, 24, 241, 24108, 'Faculty of Agriculture', NULL, NULL, 10, NULL),
(2000, 24, 241, 24109, 'Faculty of Music', NULL, NULL, 10, NULL),
(2000, 24, 241, 24110, 'Dumaguete Port', NULL, NULL, 10, NULL),
(2000, 24, 242, 24201, 'Dumaguete Belfry', NULL, NULL, 15, 242011),
(2000, 24, 242, 24202, 'Dumaguete Public Market', NULL, NULL, 10, NULL),
(2000, 24, 242, 24203, 'Rizal Boulevard', NULL, NULL, 10, NULL),
(2000, 24, 242, 24204, 'Sans Rival Bistro', NULL, NULL, 10, NULL),
(2000, 24, 242, 24205, 'The Heritage Apothecary', NULL, NULL, 10, NULL),
(2000, 24, 242, 24206, 'Iron Lifter''s Club', NULL, NULL, 10, NULL),
(2000, 24, 242, 24207, 'Quezon Park', NULL, NULL, 10, NULL),
(2000, 24, 242, 24208, 'The Heritage Apothecary', NULL, NULL, 10, NULL),
(2000, 24, 242, 24209, 'Black Barrel Depot', NULL, NULL, 10, NULL),
(2000, 24, 242, 24210, 'Blackwater Traders', NULL, NULL, 10, NULL),
(2000, 24, 242, 24211, 'Broken Mug Tavern', NULL, NULL, 10, NULL),
(2000, 24, 242, 24212, 'SaCaSol Solar Farm', NULL, NULL, 10, NULL),
(2000, 24, 242, 24213, 'Calenderia', NULL, NULL, 10, NULL),
(2000, 24, 242, 24214, 'Dumaguete Inn', NULL, NULL, 10, NULL),
(2000, 24, 242, 24215, 'Dumaguete Motel', NULL, NULL, 10, NULL),
(2000, 24, 242, 24216, 'East Gate', NULL, NULL, 10, NULL),
(2000, 24, 242, 24217, 'West Gate', NULL, NULL, 10, NULL),
(2000, 24, 242, 24218, ' Student House', NULL, NULL, 10, NULL),
(2000, 24, 242, 24219, 'Lawson', NULL, NULL, 10, NULL),
(2000, 24, 242, 24220, 'Silliman Apartments', NULL, NULL, 10, NULL),
(2000, 24, 242, 24221, 'Silliman Apartments', NULL, NULL, 10, NULL),

-- Bohol (3000)
(3000, 31, 311, 31101, 'Talibon Fish Port', NULL, NULL, 10, NULL),
(3000, 31, 312, 31201, 'Tubigon RoRo Port', NULL, NULL, 10, NULL),
(3000, 32, 321, 32101, 'The Chocolate Hills', NULL, NULL, 20, 321011),
(3000, 32, 321, 32102, 'Bilar Man-Made Forest', NULL, NULL, 10, NULL),
(3000, 32, 322, 32201, 'Tarsier Sanctuary', NULL, NULL, 25, 322011),
(3000, 32, 322, 32202, 'Loboc River Cruise', NULL, NULL, 10, NULL),
(3000, 32, 322, 32203, 'ipatan Twin Hanging Bridge', NULL, NULL, 10, NULL),
(3000, 33, 331, 33101, 'Bohol-Panglao International Airport', NULL, NULL, 10, NULL),
(3000, 33, 332, 33201, 'Tagbilaran City Port', NULL, NULL, 10, NULL),
(3000, 33, 332, 33202, 'Blood Compact Shrine', NULL, NULL, 10, NULL),
(3000, 33, 332, 33203, 'Baclayon Church', NULL, NULL, 10, NULL),
(3000, 33, 332, 33204, 'Iron Stair Apartments', NULL, NULL, 10, NULL),
(3000, 33, 332, 33205, 'White Beach', NULL, NULL, 10, NULL),
(3000, 33, 332, 33206, 'Deep Harbor Depot', NULL, NULL, 10, NULL),
(3000, 33, 332, 33207, 'Wolf Den Tavern', NULL, NULL, 10, NULL),
(3000, 33, 332, 33208, 'Tagbilaran Hotel', NULL, NULL, 10, NULL);


-- =====================================================================
-- 5. マスタデータの投入 (Items)
-- =====================================================================
INSERT INTO items (id, spot_id, name, buff_target, buff_type, buff_value, description) VALUES
(111011, 11101, 'Extreme Rope', 'MAX_AP', 'max_up', 25, '【アクティビティ】体力を鍛え上げ最大AP+25'),
(112011, 11201, 'Rich Sugarcane Juice', 'MAX_AP', 'max_up', 10, '【甘い誘惑】糖分補給で最大AP+10'),
(122031, 12203, 'Osaka Soul Takoyaki', 'HP_REGEN', 'regen', 50, '【大阪の味】熱々のたこ焼きで身も心も全回復に近づく。毎ターンHPが50自動回復する。'),
(122041, 12204, 'Icy Debug Spirit', 'DEF', 'add_percent', 50, '【極寒の地の精神。】どんなバグ（攻撃）も凍らせて防ぐ。防御力+50。'),
(122051, 12205, 'Tonkotsu Bug-Crusher', 'ATK', 'add_percent', 50, '【濃厚なとんこつスープのエネルギー】計算式を極限まで最適化し、攻撃力が50%アップする。'),
(122061, 12206, 'Tateyama Fresh Air', 'MAX_AP', 'max_up', 50, '立山連峰の清らかな空気。深呼吸するたびにバグ（ストレス）が消え、毎ターンHPが25回復する。'),
(131011, 13101, 'Dawn Energy Drink', 'MAX_AP', 'max_up', 20, '【近代化の波】占領中、最大スタミナ上限+20'),
(131021, 13102, 'Waterfront Whey Protein', 'ATK', 'add_percent', 30, '【迸る筋肉】ジムでのパンプアップ！攻撃力が15固定加算される。'),
(131031, 13103, 'Cebu Business Espresso', 'MAX_AP', 'max_up', 20, '【１日の目覚め】ビジネスパークの活力。最大AP上限が20アップする。'),
(132011, 13201, 'Magellan''s wooden cross', 'FAITH_REGEN', 'regen', 20, '【信仰の源泉】占領中、毎ターン信仰心(スタミナ)回復+20'),
(132021, 13202, 'Coral stone bricks', 'DEF', 'add_percent', 30, '【鉄壁の守り】占領中、基本防御力(DEF)+30%'),
(132031, 13203, 'Fresh tropical fruit', 'DROP_RATE', 'add_percent', 50, '【流通の要所】占領中、アイテムドロップ率+50%'),
(132041, 13204, 'Santo Niño Statue', 'FAITH_REGEN', 'regen', 20, '【幼きイエスの祝福】占領中、毎ターン信仰心(スタミナ)回復+40'),
(133021, 13302, 'Augustinian Shield', 'DEF', 'add_percent', 25, '【聖アウグスチノ会の盾】防御力が+30％'),
(133031, 13303, 'Logistics Overdrive', 'MAX_AP', 'max_up', 35, '【物流の超効率化】最大AP上限が20アップする。'),
(134011, 13401, 'Golden Lechon Skin', 'DEF', 'add_percent', 20, '【究極のパリパリ感】防御力が20%アップする。'),
(134021, 13402, 'Liberator''s Shield', 'ATK', 'add_percent', 20, '【勝利を呼ぶ信号弾】攻撃力が20%アップする。'),
(141011, 14101, 'Miracle Prayer Candle', 'DEF', 'add_percent', 30, '【奇跡の城】信仰の守護により防御力+40%'),
(141021, 14102, 'Lantaw Sea Breeze', 'HP_REGEN', 'regen', 20, '【海辺のレストランの心地よい風】毎ターンHPが20自動回復する。'),
(142011, 14201, 'Exquisite Special Chicharon', 'HP_REGEN', 'regen', 5, '【絶品レチョン】行動するたびにHPが微回復(+5)'),
(142021, 14202, 'Molave Floor Wax', 'DEF', 'add_percent', 10, '【モラベ材の床】滑るような回避と堅牢な守り。防御力が20アップ。'),
(143011, 14301, 'Traditional Tuba Yeast', 'ATK', 'add_percent', 25, '【伝統の椰子酒酵母】発酵の力が闘争心を高め、攻撃力が25%アップする。'),
(143021, 14302, 'Puerta Real Bulwark', 'DEF', 'add_percent', 30, '【石門の守護】防御力が30％加算され、難攻不落となる。'),
(143031, 14303, 'Fisherman''s Sun-Dried Catch', 'MAX_HP', 'max_up', 25, '【天日干しの干物】噛めば噛むほど力が湧き、最大HP+25アップする。'),
(151011, 15101, 'Silver school of sardines.', 'DEF', 'add_percent', 25, '【イワシトルネード】群れの動きで防御力+25%'),
(151021, 15102, 'Canyoneer''s Adrenaline', 'MAX_AP', 'max_up', 30, '【滝へのダイブ】最大AP上限が30アップする。'),
(151031, 15103, 'Nipa Thatch Insulation', 'DEF', 'add_percent', 15, '【ニッパ椰子の屋根】熱を遮断し、敵の苛烈な攻撃を和らげる。防御力が15％アップする。'),
(151041, 15104, 'Sardine Run Cloak', 'DEF', 'add_percent', 20, '【幻惑する外套】防御力が20%アップする。'),
(152011, 15201, 'Trekking poles for mountaineers', 'ATK', 'add_percent', 15, '【最高峰の頂】高所からの地の利で攻撃力+15%'),
(152021, 15202, 'Siesta Hammock', 'HP_REGEN', 'regen', 15, '【黄金のハンモック】心地よい揺れの中で、毎ターンHPが15回復する。'),
(152031, 15203, 'Tindalo Study Desk', 'DEF', 'add_percent', 15, '【頑丈なティンダロ材の机】集中力を高め、敵の妨害を退ける。防御力が15％アップする。'),
(153011, 15301, 'Whale Shark Plush Toy', 'MAX_HP', 'max_up', 40, '【巨獣の威圧】圧倒的な存在感で最大HP+40'),
(153021, 15302, 'Mysterious Spring Water', 'HP_REGEN', 'regen', 15, '【神秘の冷泉】清らかな水で毎ターンHP回復+15'),
(153031, 15303, 'Model of a bamboo raft', 'ATK', 'add_percent', 25, '【飛び込みの名所】勢いをつけて攻撃力+25%'),
(161011, 16101, 'Hero''s Kampiran (Sword)', 'ATK', 'add_percent', 30, '【英雄の地】歴史上の英雄の力が宿り攻撃力+30%'),
(161021, 16102, 'Model of an Ironclad Galleon', 'DEF', 'add_percent', 10, '【大航海時代】強固な船の守り。防御力+10%'),
(161031, 16103, 'Premium Virgin Coconut Oil', 'MAX_HP', 'max_up', 30, '【加護】肌と体を守る。最大HP+30'),
(162021, 16201, 'VIP Boarding Pass', 'WARP', 'special', 12202, '【空路】北部ダナサン(12202)へ一瞬でワープする'),
(211011, 21101, 'Victorias Pure Sugar', 'MAX_AP', 'max_up', 20, '精製された純度100%の砂糖。脳と体にエネルギーを急速チャージし、最大AP上限が30アップする。'),
(231011, 23101, 'Kanlaon Magma Core', 'ATK', 'add_percent', 30, '【煮えたぎるマグマ】破壊衝動が限界突破し、攻撃力が40%アップする。'),
(242011, 24201, 'Belfry Coral Stone', 'DEF', 'add_percent', 15, '【サンゴ石で築かれた堅牢な壁】何世紀もの風雪に耐えた重厚な守りで、防御力が20%加算される。'),
(321011, 32101, 'Bohol Earth Energy', 'HP_REGEN', 'regen', 20, '【湧き出す大地の息吹】プレイヤーの生命力を持続的に回復し、毎ターンHPが30回復する。'),
(322011, 32201, 'Tarsier Leap Boost', 'MAX_AP', 'max_up', 25, '【驚異の跳躍力】身軽なフットワークにより、最大AP上限が25アップする。');


-- =====================================================================
-- 6. マスタデータの投入 (Gods - GDD v4.1完全準拠)
-- =====================================================================
INSERT INTO gods (id, name, district_id, spot_id, special_effect, image_url, description) VALUES
(1, 'Neil', 141, 14101, 'MAX_HP +30, STAMINA -25, HP +10', 'assets/gods/Neil.png', '戦いの神。圧倒的な耐久力を誇る。'),
(2, 'Garry', 241, 24104, 'ATK +20', 'assets/gods/Garry.png', '俊敏の神。攻撃に特化している。'),
(3, 'Shem', 123, 12301, 'MAX_AP +15, HP +10, AP +10', 'assets/gods/Shem.png', '太陽の神。バランスの取れた性能。'),
(4, 'Quisie', 161, 16101, 'HP -20, FAITH 100', 'assets/gods/Quisie.png', '静寂の神。信仰心の高さが武器。'),
(5, 'Eduardo', 131, 13101, 'DEF +15', 'assets/gods/Eduardo.png', '鉄壁の神。防御性能が高い。'),
(6, 'Kurt', 132, 13202, 'STAMINA +30, HP -10', 'assets/gods/Kurt.png', '疾風の神。スタミナが豊富。'),
(7, 'Stephen', 332, 33201, 'FAITH_REGEN (5)', 'assets/gods/Stephen.png', '幻影の神。信仰心が自動回復する。'),
(8, 'Bernardine', 151, 15101, 'MAX_AP +30, AP +30', 'assets/gods/Bernardine.png', '洞察の神。スキルの回転率が高い。');