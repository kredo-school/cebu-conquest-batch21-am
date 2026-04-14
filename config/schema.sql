-- 外部キー制約を一時的に無効化してリセット
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS user_items, occupations, match_results, items, spots, users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. ユーザーテーブル (users)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    player_color VARCHAR(20) DEFAULT '#3498db',
    max_hp INT DEFAULT 100,
    current_hp INT DEFAULT 100,
    stamina INT DEFAULT 100,
    atk INT DEFAULT 100,
    def INT DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. スポットマスター (spots)
CREATE TABLE spots (
    id INT PRIMARY KEY,
    island_id INT,
    area_id INT,
    district_id INT,
    name VARCHAR(100) NOT NULL,
    map_x FLOAT NULL,
    map_y FLOAT NULL,
    capture_cost INT DEFAULT 10,
    drop_item_id INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. アイテムマスター (items)
CREATE TABLE items (
    id INT PRIMARY KEY,
    spot_id INT,
    name VARCHAR(100) NOT NULL,
    buff_target VARCHAR(50),
    buff_type VARCHAR(50),
    buff_value INT,
    description TEXT,
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 占領状況 (occupations)
CREATE TABLE occupations (
    spot_id INT PRIMARY KEY,
    user_id INT,
    occupied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. ユーザー所持アイテム (user_items)
CREATE TABLE user_items (
    user_id INT,
    item_id INT,
    quantity INT DEFAULT 1,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 対戦結果履歴 (match_results)
CREATE TABLE match_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    score INT DEFAULT 0,
    spots_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 【全25データ投入】スポット登録 (Spots.csv準拠)
-- ==========================================

INSERT INTO spots (island_id, area_id, district_id, id, name, map_x, map_y, capture_cost, drop_item_id) VALUES
(1000, 11, 111, 11101, 'マゼラン・クロス', 400, 550, 15, 111011),
(1000, 11, 112, 11201, 'サン_ペドロ要塞', 320, 480, 20, 112011),
(1000, 11, 112, 11202, 'カルボン・マーケット', 350, 500, 15, 112021),
(1000, 11, 112, 11203, 'コロン・ストリート', 330, 520, 15, 112031),
(1000, 11, 112, 11204, 'セブ港湾エリア（ボート）', NULL, NULL, 30, 112041),
(1000, 11, 113, 11301, 'Cebu ITパーク', 450, 300, 10, 113011),
(1000, 11, 114, 11401, 'シラオ・ガーデン', 420, 100, 15, 114011),
(1000, 11, 114, 11402, 'テンプル・オブ・レア', 400, 120, 20, 114021),
(1000, 11, 114, 11403, '山頂展望台（トップス）', 380, 80, 30, 114031),
(1000, 12, 121, 12101, 'マクタン・セブ国際空港', 850, 150, 40, 121011),
(1000, 12, 121, 12102, 'マクタン・シュライン', 900, 100, 25, 121021),
(1000, 12, 121, 12103, '鉄壁の造船所', NULL, NULL, 20, 121031),
(1000, 12, 121, 12104, '伝統的なギター工房', NULL, NULL, 15, 121041),
(1000, 13, 131, 13101, 'ダナサン・アドベンチャーパーク', 600, -200, 25, 131011),
(1000, 13, 132, 13201, 'ボゴ・シティ・ピア', 700, -400, 20, 132011),
(1000, 13, 133, 13301, 'バンタヤン島（フェリー）', 400, -600, 35, 133011),
(1000, 13, 134, 13401, 'マラパスクア島（ダイビング）', 850, -650, 30, 134011),
(1000, 14, 141, 14101, 'オスロブ（ジンベエザメ）', 200, 1200, 50, 141011),
(1000, 14, 142, 14201, 'カワサン滝', 100, 1000, 30, 142011),
(1000, 14, 143, 14301, 'モアルボアル（イワシ）', 50, 800, 25, 143011),
(1000, 14, 144, 14401, 'シマラ教会', 300, 900, 20, 144011),
(1000, 14, 145, 14501, 'カルカル（靴の街）', 350, 750, 15, 145011),
(1001, 15, 151, 15101, 'チョコレート・ヒルズ', 1500, 600, 40, 151011),
(1001, 15, 152, 15201, 'ロボック川クルーズ', 1400, 800, 20, 152011),
(1001, 15, 153, 15301, 'パングラオ島', 1300, 1000, 30, 153011);

-- ==========================================
-- 【全25データ投入】アイテム登録 (Items.csv準拠)
-- ==========================================

INSERT INTO items (id, name, spot_id, buff_target, buff_type, buff_value, description) VALUES
(111011, 'マゼランの木製十字架', 11101, 'FAITH_REGEN', 'regen', 20, '【信仰の源泉】占領中、毎ターン信仰心(スタミナ)回復+20'),
(112011, 'サンゴ石のレンガ', 11201, 'DEF', 'add_percent', 30, '【鉄壁の守り】占領中、基本防御力(DEF)+30%'),
(112021, '新鮮なトロピカルフルーツ', 11202, 'DROP_RATE', 'add_percent', 50, '【流通の要所】占領中、アイテムドロップ率+50%'),
(112031, '老舗のバナナキュー', 11203, 'FAITH_REGEN', 'regen', 10, '【最古の通り】占領中、毎ターン信仰心回復+10'),
(112041, '港湾フェリー乗船券', 11204, 'SAIL', 'special', 14101, '【海路】南部ジンベエザメ(14101)へショートカット可能'),
(113011, 'ハイテクICチップ', 11301, 'ATK', 'add_percent', 15, '【IT拠点】デジタルな攻撃支援により攻撃力+15%'),
(114011, '魅惑のバラ', 11401, 'DEF', 'add_percent', 20, '【魅惑の花畑】敵の侵攻を阻み防御力+20%'),
(114021, '大理石の女神像', 11402, 'MAX_HP', 'max_up', 50, '【愛の神殿】占領中、最大HP上限+50'),
(114031, '占いの赤い木札', 11403, 'FAITH_REGEN', 'regen', 15, '【静寂の祈り】精神を統一し毎ターンのスタミナ回復+15'),
(121011, 'VIP搭乗チケット', 12101, 'WARP', 'special', 13101, '【空路】北部ダナサン(13101)へ一瞬でワープする'),
(121021, '英雄のカンピラン（剣）', 12102, 'ATK', 'add_percent', 30, '【英雄の地】歴史上の英雄の力が宿り攻撃力+30%'),
(121031, '鉄壁のガレオン船模型', 12103, 'DEF', 'add_percent', 10, '【大航海時代】強固な船の守り。防御力+10%'),
(121041, '高級ヴァージンココナッツオイル', 12104, 'REGEN', 'regen', 10, '【癒やしの雫】毎ターンHPが10回復する'),
(131011, '頑丈なヘルメット', 13101, 'DEF', 'add_percent', 15, '【冒険の備え】ダナサンの険しい道でも安心。防御力+15%'),
(132011, '港の作業用フック', 13201, 'ATK', 'add_percent', 10, '【物流の力】重い荷も引き寄せる。攻撃力+10%'),
(133011, '干し魚（ダンギット）', 13301, 'FAITH_REGEN', 'regen', 5, '【島の朝食】バンタヤン名物。スタミナ回復+5'),
(134011, 'ダイバーズウォッチ', 13401, 'TIME', 'special', 10, '【深海の時】行動可能時間がわずかに延長される'),
(141011, 'ジンベエザメのチャーム', 14101, 'MAX_HP', 'max_up', 100, '【海の王者】圧倒的な生命力。最大HP上限+100'),
(142011, '清涼な竹筒の水', 14201, 'REGEN', 'regen', 20, '【滝の癒やし】カワサン滝の清流。毎ターンHPが20回復'),
(143011, '銀光のイワシ網', 14301, 'DROP_RATE', 'add_percent', 20, '【一網打尽】アイテムドロップ率が20%アップする'),
(144011, '奇跡のメダイ', 14401, 'DEF', 'add_percent', 40, '【聖母の加護】シマラ教会の奇跡。防御力+40%'),
(145011, '手作りの革サンダル', 14501, 'MOVE', 'add_value', 10, '【健脚の靴】カルカル名産。移動速度がアップする'),
(151011, 'メガネザル（ターシャ）の像', 15101, 'ATK', 'add_percent', 25, '【野生の勘】チョコレートヒルズの自然。攻撃力+25%'),
(152011, '伝統のバンブーハット', 15201, 'DEF', 'add_percent', 10, '【川の静寂】ロボック川の船旅。防御力+10%'),
(153011, '極上のホワイトサンド', 15301, 'FAITH_REGEN', 'regen', 30, '【至福の休息】パングラオの白い砂浜。スタミナ回復+30');