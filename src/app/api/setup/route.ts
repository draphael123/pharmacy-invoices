import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
    // Core tables
    await sql`
      CREATE TABLE IF NOT EXISTS pharmacies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE,
        address TEXT,
        contact_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        active BOOLEAN DEFAULT true
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        invoice_number VARCHAR(100),
        invoice_date DATE NOT NULL,
        upload_date TIMESTAMP DEFAULT NOW(),
        uploaded_by INTEGER REFERENCES users(id),
        total_amount DECIMAL(12,2),
        item_count INTEGER,
        file_url TEXT,
        status VARCHAR(50) DEFAULT 'processed',
        notes TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS line_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        product_name VARCHAR(255) NOT NULL,
        product_code VARCHAR(100),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(12,2) NOT NULL,
        invoice_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Add category column if it doesn't exist
    try {
      await sql`ALTER TABLE line_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);`;
    } catch {
      // Column might already exist, ignore error
    }

    // NEW: Product categories table
    await sql`
      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(20) DEFAULT '#7c9a82',
        keywords TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // NEW: Product pricing table
    await sql`
      CREATE TABLE IF NOT EXISTS product_pricing (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(255) NOT NULL,
        product_code VARCHAR(100),
        unit_price DECIMAL(10,2) NOT NULL,
        effective_date DATE DEFAULT CURRENT_DATE,
        source VARCHAR(100) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(product_name, product_code, effective_date)
      );
    `;

    // NEW: Upload history table
    await sql`
      CREATE TABLE IF NOT EXISTS upload_history (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        file_size INTEGER,
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        pharmacy_name VARCHAR(255),
        row_count INTEGER,
        invoice_count INTEGER,
        item_count INTEGER,
        status VARCHAR(50) DEFAULT 'completed',
        error_message TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // NEW: Alerts table
    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'info',
        title VARCHAR(255) NOT NULL,
        message TEXT,
        product_name VARCHAR(255),
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        threshold_value DECIMAL(12,2),
        actual_value DECIMAL(12,2),
        is_read BOOLEAN DEFAULT false,
        is_dismissed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // NEW: Saved reports/views table
    await sql`
      CREATE TABLE IF NOT EXISTS saved_views (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        filters JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Create indexes (IF NOT EXISTS handles duplicates)
    await sql`CREATE INDEX IF NOT EXISTS idx_line_items_invoice_date ON line_items(invoice_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_line_items_pharmacy ON line_items(pharmacy_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_line_items_product ON line_items(product_code);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_line_items_category ON line_items(category);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invoices_pharmacy ON invoices(pharmacy_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_upload_history_pharmacy ON upload_history(pharmacy_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);`;

    // Insert default product categories (ON CONFLICT handles duplicates)
    try {
      await sql`
        INSERT INTO product_categories (name, description, color, keywords) VALUES
          ('Testosterone', 'Testosterone replacement therapy products', '#3b82f6', ARRAY['testosterone', 'trt', 'androgel']),
          ('ED Medications', 'Erectile dysfunction medications', '#8b5cf6', ARRAY['tadalafil', 'sildenafil', 'cialis', 'viagra']),
          ('Hormone Therapy', 'Hormone replacement and therapy', '#ec4899', ARRAY['estrogen', 'estriol', 'progesterone', 'hormone']),
          ('Anti-Estrogen', 'Aromatase inhibitors and anti-estrogens', '#f59e0b', ARRAY['anastrozole', 'arimidex', 'letrozole']),
          ('Hair Loss', 'Hair loss treatment products', '#10b981', ARRAY['minoxidil', 'finasteride', 'hair']),
          ('Skincare', 'Dermatological and skincare products', '#06b6d4', ARRAY['cream', 'face', 'skin', 'topical', 'niacinamide']),
          ('Cardiovascular', 'Heart and blood pressure medications', '#ef4444', ARRAY['spironolactone', 'blood pressure', 'heart']),
          ('Other', 'Uncategorized medications', '#6b7280', ARRAY[])
        ON CONFLICT (name) DO NOTHING;
      `;
    } catch {
      // Categories might already exist, ignore error
    }

    return NextResponse.json({ success: true, message: 'Database setup complete with all new tables' });
  } catch (error) {
    console.error('Error setting up database:', error);
    return NextResponse.json({ error: 'Failed to setup database', details: String(error) }, { status: 500 });
  }
}
