-- Multi-Store Module
CREATE TABLE IF NOT EXISTS stores (
  store_id SERIAL PRIMARY KEY,
  store_code VARCHAR(50) UNIQUE NOT NULL,
  store_name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(200),
  gstin VARCHAR(15),
  manager_name VARCHAR(200),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_transfers (
  transfer_id SERIAL PRIMARY KEY,
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  from_store_id INT REFERENCES stores(store_id),
  to_store_id INT REFERENCES stores(store_id),
  transfer_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_transfer_items (
  item_id SERIAL PRIMARY KEY,
  transfer_id INT REFERENCES store_transfers(transfer_id) ON DELETE CASCADE,
  part_id INT REFERENCES parts(part_id),
  quantity INT NOT NULL,
  received_quantity INT DEFAULT 0,
  remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_store_transfers_status ON store_transfers(status);
