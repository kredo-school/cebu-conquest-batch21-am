-- 1. 制約を一時的に無効化して、古いテーブルを「作成前」に一掃する
SET FOREIGN_KEY_CHECKS = 0;

-- 2. 並び順を修正（参照している「子」から先に消す）
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS gods;          -- items を参照しているので一番先に消す！
DROP TABLE IF EXISTS user_items;    -- items, users を参照しているので先に消す
DROP TABLE IF EXISTS occupations;   -- spots, users を参照しているので先に消す
DROP TABLE IF EXISTS match_results; -- users を参照しているので先に消す

-- 3. その後に「親」を消す
DROP TABLE IF EXISTS items;  -- 親
DROP TABLE IF EXISTS spots;  -- 親
DROP TABLE IF EXISTS areas;  -- 親
DROP TABLE IF EXISTS islands;-- 親
DROP TABLE IF EXISTS users;  -- 親

-- 4. 制約をオンに戻す
SET FOREIGN_KEY_CHECKS = 1;

-- 2. テーブルの新規作成 (設計図)

CREATE TABLE islands (id INT PRIMARY KEY, name VARCHAR(100)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE areas (
    id INT PRIMARY KEY, 
    island_id INT, 
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) DEFAULT 'dummy_pass',
    security_question VARCHAR(255) NOT NULL,
    security_answer VARCHAR(255) NOT NULL,
    player_color VARCHAR(20) DEFAULT '#3498db',
    max_hp INT DEFAULT 100, 
    current_hp INT DEFAULT 100,
    stamina INT DEFAULT 100, 
    atk INT DEFAULT 100, 
    def INT DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_key VARCHAR(10) UNIQUE NOT NULL,
    host_user_id INT NOT NULL,
    guest_user_id INT DEFAULT NULL,
    status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 外部キー制約を追加してデータの整合性を守る
    FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE spots (
    id INT PRIMARY KEY,
    island_id INT NOT NULL,
    area_id INT NOT NULL,
    district_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    map_x FLOAT NULL, map_y FLOAT NULL,
    capture_cost INT DEFAULT 10,
    drop_item_id INT NULL,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE items (
    id INT PRIMARY KEY,
    spot_id INT NULL, 
    name VARCHAR(100) NOT NULL,
    buff_target VARCHAR(50),
    buff_type VARCHAR(50),
    buff_value INT,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE gods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    atk_bonus INT DEFAULT 0,
    stamina_bonus INT DEFAULT 0,
    ap_regen_bonus INT DEFAULT 0,
    start_item_id INT,
    image_url VARCHAR(255),
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE occupations (
    spot_id INT PRIMARY KEY,
    user_id INT,
    occupied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ★足りなかったテーブル: ユーザー所持アイテム
CREATE TABLE user_items (
    user_id INT,
    item_id INT,
    quantity INT DEFAULT 1,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ★足りなかったテーブル: 対戦結果
CREATE TABLE match_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    score INT DEFAULT 0,
    spots_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. マスタデータの投入
INSERT INTO islands (id, name) VALUES (1000, 'Cebu・Mactan');

INSERT INTO areas (island_id, id, name) VALUES
(1000, 13, 'Core (Cebu City)'),
(1000, 16, 'Mactan Island'),
(1000, 11, 'North Area'),
(1000, 15, 'South Adventure'),
(1000, 14, 'South Heritage');

-- 4. CSVから抽出した全スポットの投入
INSERT INTO spots (island_id, area_id, district_id, id, name, map_x, map_y, capture_cost, drop_item_id) VALUES
(1000, 13, 132, 13201, 'Magellan''s Cross', 400.0, 550.0, 15, 132011),
(1000, 13, 132, 13202, 'Fort San Pedro', 320.0, 480.0, 20, 132021),
(1000, 13, 132, 13203, 'カルボン・マーケット', 350.0, 500.0, 15, 132031),
(1000, 13, 132, 13204, 'BASILICA del SANTO NINO ', NULL, NULL, 10, 132041),
(1000, 13, 132, 13205, 'コロン・ストリート', 330.0, 520.0, 15, 132051),
(1000, 13, 133, 13301, 'セブ港湾エリア（ボート）', 330.0, 520.0, 30, 133011),
(1000, 13, 131, 13101, 'IT Park', 450.0, 300.0, 10, 131011),
(1000, 13, 131, 13102, 'Waterfront Hotel', NULL, NULL, 10, 131021),
(1000, 13, 131, 13103, 'Ayala Malls Center', NULL, NULL, 10, 131031),
(1000, 13, 134, 13401, 'シラオ・ガーデン', 420.0, 100.0, 15, 134011),
(1000, 13, 134, 13402, 'テンプル・オブ・レア', 400.0, 120.0, 20, 134021),
(1000, 13, 134, 13403, '道教寺院（タオイスト）', 380.0, 150.0, 30, 134031),
(1000, 13, 135, 13302, 'SM City Cebu', 500.0, 450.0, 20, 135011),
(1000, 16, 162, 16201, 'マクタン・セブ国際空港', 850.0, 150.0, 40, 162021),
(1000, 16, 161, 16101, 'マクタン・シュライン', 900.0, 100.0, 25, 161011),
(1000, 16, 161, 16102, 'マゼラン記念碑', 910.0, 110.0, 20, 161021),
(1000, 16, 161, 16103, 'リゾートエリア', 950.0, 200.0, 15, 161031),
(1000, 16, 162, 16202, 'ギター工場 (Alegre)', 880.0, 250.0, 10, 162021),
(1000, 16, 162, 16204, 'コルドバ (10000 Roses)', 820.0, 300.0, 10, 162031),
(1000, 16, 163, 16302, 'マングローブ林', 800.0, 280.0, 15, 162041),
(1000, 16, 162, 16203, 'ラプ＝ラプ市役所', 800.0, 200.0, 15, 162051),
(1000, 11, 111, 11101, 'ダナサン・エコパーク', 500.0, 50.0, 20, 111011),
(1000, 11, 112, 11201, 'サトウキビ畑', 550.0, 80.0, 10, 112011),
(1000, 15, 153, 15301, 'ジンベエザメ・エリア', 300.0, 900.0, 30, 153011),
(1000, 15, 153, 15302, 'ツマログ滝', 280.0, 880.0, 25, 153021),
(1000, 15, 153, 15303, 'カワサン滝', 200.0, 850.0, 15, 153031),
(1000, 15, 151, 15101, 'パナグサマ・ビーチ', 180.0, 800.0, 20, 151011),
(1000, 14, 142, 14201, 'カルカル・マーケット', 350.0, 750.0, 15, 142011),
(1000, 14, 141, 14101, 'シマラ聖堂', 380.0, 800.0, 30, 141011),
(1000, 15, 152, 15201, 'オスメニャ・ピーク', 330.0, 850.0, 20, 152011);

-- 5. アイテムと神様の投入
INSERT IGNORE INTO items (id, spot_id, name, buff_target, buff_type, buff_value, description) VALUES
(1, NULL, 'Garryの短剣', 'attack', 'flat', 5, '初期装備'),
(2, NULL, 'Quisieの果実', 'stamina', 'flat', 10, '初期装備'),
(3, NULL, 'Shemの古文書', 'ap_regen', 'flat', 2, '初期装備'),
(132011, 13201, 'マゼランの木製十字架', 'FAITH_REGEN', 'regen', 20, 'スタミナ回復+20'),
(132021, 13202, 'サンゴ石のレンガ', 'DEF', 'add_percent', 30, '防御力+30%'),
(132031, 13203, '新鮮なトロピカルフルーツ', 'DROP_RATE', 'add_percent', 50, 'ドロップ率+50%'),
(132051, 13205, '老舗のバナナキュー', 'FAITH_REGEN', 'regen', 10, 'スタミナ回復+10'),
(133011, 13301, '港湾フェリー乗船券', 'SAIL', 'special', 14101, '海路ショートカット'),
(131011, 13101, '夜明けのエナジードリンク', 'MAX_AP', 'max_up', 20, '最大AP+20'),
(134011, 13401, 'シラオのケイトウの花', 'DEF', 'add_percent', 20, '防御力+20%'),
(134021, 13402, '大理石の女神像', 'MAX_HP', 'max_up', 50, '最大HP+50'),
(134031, 13403, '占いの赤い木札', 'FAITH_REGEN', 'regen', 15, 'スタミナ回復+15'),
(135011, 13302, '限定ショッピングバッグ', 'ATK', 'add_percent', 10, '攻撃力+10%'),
(162021, 16201, 'VIP搭乗チケット', 'WARP', 'special', 13101, '空港ワープ'),
(161011, 16101, '英雄のカンピラン（剣）', 'ATK', 'add_percent', 30, '攻撃力+30%'),
(161021, 16102, '鉄壁のガレオン船模型', 'DEF', 'add_percent', 10, '防御力+10%'),
(161031, 16103, '高級ヴァージンココナッツオイル', 'MAX_HP', 'max_up', 30, '最大HP+30'),
(162031, 16204, '光り輝くクリスタルローズ', 'DROP_RATE', 'add_percent', 30, 'ドロップ率+30%'),
(162041, 16302, 'マングローブの根の杖', 'MAX_AP', 'max_up', 15, '最大AP+15'),
(162051, 16203, '市民権バッジ', 'DEF', 'add_percent', 5, '防御力+5'),
(111011, 11101, 'エクストリーム・ロープ', 'MAX_AP', 'max_up', 25, '最大AP+25'),
(112011, 11201, '濃厚サトウキビジュース', 'MAX_AP', 'max_up', 10, '最大AP+10'),
(153011, 15301, 'ジンベエザメのぬいぐるみ', 'MAX_HP', 'max_up', 40, '最大HP+40'),
(153021, 15302, '神秘の湧き水', 'HP_REGEN', 'regen', 15, 'HP回復+15'),
(153031, 15303, '竹のイカダ模型', 'ATK', 'add_percent', 25, '攻撃力+25%'),
(151011, 15101, 'イワシの群れの銀鱗', 'DEF', 'add_percent', 25, '防御力+25%'),
(142011, 14201, '絶品特製チチャロン', 'HP_REGEN', 'regen', 5, 'HP回復+5'),
(141011, 14101, '奇跡の祈りキャンドル', 'DEF', 'add_percent', 40, '防御力+40%'),
(152011, 15201, '登山家のトレッキングポール', 'ATK', 'add_percent', 15, '攻撃力+15%');

-- 神様データ
INSERT INTO gods (name, atk_bonus, stamina_bonus, ap_regen_bonus, start_item_id, image_url, description) VALUES 
('Garry', 20, 0, 0, 1, 'assets/images/gods/Garry.jpg', '戦いの神。初期攻撃力+20'),
('Quisie', 0, 30, 0, 2, 'assets/images/gods/Quisie.jpg', '大地の女神。初期スタミナ+30'),
('Shem', 0, 0, 5, 3, 'assets/images/gods/Shem.jpg', '知識の神。AP回復量+5');