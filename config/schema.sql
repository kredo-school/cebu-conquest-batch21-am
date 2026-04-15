-- Cebu Conquest Database Schema (2026-04-15 Final Version)
-- 役割: アップロードされた最新CSVデータに基づくテーブル構築と初期データ投入

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
    id INT PRIMARY KEY, -- spot_id (PK)
    island_id INT,
    area_id INT,
    district_id INT,
    name VARCHAR(100) NOT NULL,
    map_x FLOAT NULL,
    map_y FLOAT NULL,
    capture_cost INT DEFAULT 10,
    drop_item_id INT -- drop_item_id (FK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. アイテムマスター (items)
CREATE TABLE items (
    id INT PRIMARY KEY, -- drop_item_id
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
-- 【CSVデータ投入】スポット登録 (全27スポット)
-- ==========================================

INSERT INTO spots (island_id, area_id, district_id, id, name, map_x, map_y, capture_cost, drop_item_id) VALUES
-- セブ市内 (District 111-115)
(1000, 11, 111, 11101, 'マゼラン・クロス', 400, 550, 15, 111011),
(1000, 11, 112, 11201, 'サン・ペドロ要塞', 320, 480, 20, 112011),
(1000, 11, 112, 11202, 'カルボン・マーケット', 350, 500, 15, 112021),
(1000, 11, 112, 11203, 'コロン・ストリート', 330, 520, 15, 112031),
(1000, 11, 112, 11204, 'セブ港湾エリア（ボート）', 330, 520, 30, 112041),
(1000, 11, 113, 11301, 'Cebu ITパーク', 450, 300, 10, 113011),
(1000, 11, 114, 11401, 'シラオ・ガーデン', 420, 100, 15, 114011),
(1000, 11, 114, 11402, 'テンプル・オブ・レア', 400, 120, 20, 114021),
(1000, 11, 114, 11403, '山頂展望台（トップス）', 380, 80, 30, 114031),
(1000, 11, 115, 11501, 'SM City Cebu', 500, 450, 20, 115011),

-- マクタン島 (District 121-122)
(1000, 12, 121, 12101, 'マクタン・セブ国際空港', 850, 150, 40, 121011),
(1000, 12, 121, 12102, 'マクタン・シュライン', 900, 100, 25, 121021),
(1000, 12, 121, 12103, '鉄壁の造船所', 910, 110, 20, 121031),
(1000, 12, 121, 12104, '伝統的なギター工房', 950, 200, 15, 121041),
(1000, 12, 121, 12105, 'マクタンの隠れ家ビーチ', 880, 250, 10, 121051),
(1000, 12, 122, 12201, 'ラプ＝ラプ市役所', 820, 210, 15, 122011),
(1000, 12, 122, 12202, 'オランゴ島（渡り鳥）', 1050, 320, 35, 122021),
(1000, 12, 122, 12203, 'マングローブの森', 980, 380, 15, 122031),

-- 北部エリア (District 131-132)
(1000, 13, 131, 13101, 'ダナサン・アドベンチャーパーク', 600, -200, 25, 131011),
(1000, 13, 131, 13102, '北部サトウキビ農園', 650, -250, 20, 131021),
(1000, 13, 132, 13201, 'ボゴ・シティ・ピア', 720, -410, 20, 132011),

-- 南部エリア (District 141-145)
(1000, 14, 141, 14101, 'オスロブ（ジンベエザメ）', 210, 1250, 50, 141011),
(1000, 14, 142, 14201, 'カワサン滝', 120, 1020, 30, 142011),
(1000, 14, 143, 14301, 'モアルボアル（イワシ）', 60, 820, 25, 143011),
(1000, 14, 143, 14302, 'ペスカドール島', 40, 850, 30, 143021),
(1000, 14, 144, 14401, 'シマラ教会', 310, 910, 20, 144011),
(1000, 14, 145, 14501, 'カルカル（靴の街）', 360, 760, 15, 145011);

-- ==========================================
-- 【CSVデータ投入】アイテム登録 (全27アイテム)
-- ==========================================

INSERT INTO items (id, spot_id, name, buff_target, buff_type, buff_value, description) VALUES
(111011, 11101, 'マゼランの木製十字架', 'FAITH_REGEN', 'regen', 20, '【信仰の源泉】占領中、毎ターン信仰心(スタミナ)回復+20'),
(112011, 11201, 'サンゴ石のレンガ', 'DEF', 'add_percent', 30, '【鉄壁の守り】占領中、基本防御力(DEF)+30%'),
(112021, 11202, '新鮮なトロピカルフルーツ', 'DROP_RATE', 'add_percent', 50, '【流通の要所】占領中、アイテムドロップ率+50%'),
(112031, 11203, '老舗のバナナキュー', 'FAITH_REGEN', 'regen', 10, '【最古の通り】占領中、毎ターン信仰心回復+10'),
(112041, 11204, '港湾フェリー乗船券', 'SAIL', 'special', 14101, '【海路】南部ジンベエザメ(14101)へショートカット可能'),
(113011, 11301, '夜明けのエナジードリンク', 'STAMINA_REGEN', 'regen', 25, '【不夜城】ITパークの夜明けを支える力。スタミナ回復+25'),
(114011, 11401, 'シラオのケイトウの花', 'DEF', 'add_percent', 15, '【美しき盾】シラオの景観が心身を守る。防御力+15%'),
(114021, 11402, '大理石の女神像', 'MAX_HP', 'max_up', 50, '【愛の神殿】占領中、最大HP上限+50'),
(114031, 11403, '占いの赤い木札', 'FAITH_REGEN', 'regen', 15, '【静寂の祈り】精神を統一し毎ターンのスタミナ回復+15'),
(115011, 11501, '限定ショッピングバッグ', 'ATK', 'add_percent', 10, '【買い物は戦い】占領中、攻撃力が10アップする'),
(121011, 12101, 'VIP搭乗チケット', 'WARP', 'special', 13101, '【空路】北部ダナサン(13101)へ一瞬でワープする'),
(121021, 12102, '英雄のカンピラン（剣）', 'ATK', 'add_percent', 30, '【英雄の地】歴史上の英雄の力が宿り攻撃力+30%'),
(121031, 12103, '鉄壁のガレオン船模型', 'DEF', 'add_percent', 10, '【大航海時代】強固な船の守り。防御力+10%'),
(121041, 12104, '高級ヴァージンココナッツオイル', 'MAX_HP', 'max_up', 30, '【加護】肌と体を守る。最大HP+30'),
(121051, 12105, 'マクタン・ハンドメイドギター', 'ATK', 'add_percent', 20, '【士気高揚】奏でる音色で攻撃力+20%'),
(122011, 12201, '市民権バッジ', 'DEF', 'add_value', 5, '【ラプラプの誇り】地元愛により防御力が5アップする'),
(122021, 12202, '光り輝くクリスタルローズ', 'MAX_HP', 'max_up', 40, '【秘境の輝き】生命力を活性化させ、最大HP+40'),
(122031, 12203, 'マングローブの根の杖', 'ATK', 'add_percent', 15, '【大地の支え】湿地帯の生命力で攻撃力+15%'),
(131011, 13101, 'エクストリーム・ロープ', 'DEF', 'add_percent', 10, '【落下防止】どんな衝撃も吸収し、防御力+10%'),
(131021, 13102, '濃厚サトウキビジュース', 'STAMINA_REGEN', 'regen', 20, '【即効エネルギー】糖分を一気に補給。スタミナ回復+20'),
(132011, 13201, '登山家のトレッキングポール', 'MOVE_SPEED', 'add_value', 10, '【軽快な足取り】移動速度がわずかにアップする'),
(141011, 14101, 'ジンベエザメのぬいぐるみ', 'MAX_HP', 'max_up', 100, '【海の王者の友】圧倒的な安心感で最大HP+100'),
(142011, 14201, '神秘の湧き水', 'HP_REGEN', 'regen', 20, '【清涼な癒やし】清らかな水で毎ターンのHP回復+20'),
(143011, 14301, '竹のイカダ模型', 'SAIL', 'special', 11204, '【水上の知恵】セブ港湾エリアへ海路で戻れるようになる'),
(143021, 14302, 'イワシの群れの銀鱗', 'DROP_RATE', 'add_percent', 30, '【きらめく幸運】アイテム発見率が30%アップする'),
(144011, 14401, '奇跡の祈りキャンドル', 'DEF', 'add_percent', 40, '【祈りの光】守護の力が宿り、防御力が40%アップする'),
(145011, 14501, '絶品特製チチャロン', 'ATK', 'add_value', 20, '【至福の背徳感】エネルギーが溢れ、攻撃力が20アップする');