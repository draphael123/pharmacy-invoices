import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
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
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_line_items_invoice_date ON line_items(invoice_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_line_items_pharmacy ON line_items(pharmacy_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_line_items_product ON line_items(product_code);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invoices_pharmacy ON invoices(pharmacy_id);`;

    return NextResponse.json({ success: true, message: 'Database setup complete' });
  } catch (error) {
    console.error('Error setting up database:', error);
    return NextResponse.json({ error: 'Failed to setup database' }, { status: 500 });
  }
}

