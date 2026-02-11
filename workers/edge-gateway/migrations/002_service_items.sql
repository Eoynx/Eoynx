-- Service Items table for searchable content within services
-- 각 서비스에 속하는 검색 가능한 콘텐츠 (상품, 관광지, 맛집 등)

CREATE TABLE IF NOT EXISTS service_items (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ko TEXT,
  description TEXT,
  description_ko TEXT,
  category TEXT,
  tags TEXT,  -- JSON array: ["tag1", "tag2"]
  price REAL,
  currency TEXT DEFAULT 'KRW',
  availability TEXT DEFAULT 'available',  -- available, limited, unavailable
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  image_url TEXT,
  metadata TEXT,  -- JSON object for flexible additional data
  location TEXT,  -- JSON: {"lat": 36.35, "lng": 127.38, "address": "..."}
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON service_items(service_id);
CREATE INDEX IF NOT EXISTS idx_service_items_category ON service_items(category);
CREATE INDEX IF NOT EXISTS idx_service_items_name ON service_items(name);

-- Insert sample data for demonstration
INSERT OR IGNORE INTO service_items (id, service_id, name, name_ko, description, description_ko, category, tags, price, rating, review_count, image_url, location) VALUES
-- 대전으로 서비스 관광지 예시
('item-001', 'daejeon-tour', '한밭수목원', '한밭수목원', 'One of the largest urban arboretums in Korea', '국내 최대 규모의 도심 속 수목원', 'attraction', '["nature", "park", "family"]', 0, 4.7, 2341, '/images/hanbat.jpg', '{"lat": 36.368, "lng": 127.388, "address": "대전광역시 서구 둔산대로 169"}'),
('item-002', 'daejeon-tour', '엑스포과학공원', '엑스포과학공원', 'Science park from 1993 Expo', '1993 엑스포 개최지, 과학 테마파크', 'attraction', '["science", "museum", "family"]', 3000, 4.5, 1892, '/images/expo.jpg', '{"lat": 36.374, "lng": 127.391, "address": "대전광역시 유성구 대덕대로 480"}'),
('item-003', 'daejeon-tour', '성심당 본점', '성심당 본점', 'Famous bakery since 1956', '1956년 창업, 대전 대표 베이커리', 'restaurant', '["bakery", "cafe", "famous"]', 5000, 4.9, 8923, '/images/sungsim.jpg', '{"lat": 36.327, "lng": 127.427, "address": "대전광역시 중구 대종로480번길 15"}'),
('item-004', 'daejeon-tour', '궁동 칼국수거리', '궁동 칼국수거리', 'Traditional noodle restaurant street', '전통 칼국수 맛집 거리', 'restaurant', '["noodle", "traditional", "local"]', 8000, 4.6, 3421, '/images/kalguksu.jpg', '{"lat": 36.362, "lng": 127.356, "address": "대전광역시 유성구 궁동"}'),
-- 서울맛집 서비스 예시
('item-011', 'seoul-food', '광장시장 빈대떡', '광장시장 빈대떡', 'Traditional Korean pancake at Gwangjang Market', '광장시장 전통 빈대떡', 'restaurant', '["traditional", "market", "street-food"]', 12000, 4.7, 5672, '/images/bindaetteok.jpg', '{"lat": 37.570, "lng": 127.009, "address": "서울특별시 종로구 창경궁로 88"}'),
('item-012', 'seoul-food', '을지로 노가리골목', '을지로 노가리골목', 'Famous dried fish alley', '을지로 노가리 맥주 골목', 'restaurant', '["bar", "retro", "famous"]', 15000, 4.4, 3241, '/images/nogari.jpg', '{"lat": 37.566, "lng": 126.991, "address": "서울특별시 중구 을지로13길"}');
