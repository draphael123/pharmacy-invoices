import { sql } from '@vercel/postgres';

export interface Pharmacy {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  contact_email: string | null;
  created_at: Date;
  active: boolean;
}

export interface Invoice {
  id: number;
  pharmacy_id: number;
  invoice_number: string | null;
  invoice_date: Date;
  upload_date: Date;
  uploaded_by: number | null;
  total_amount: number;
  item_count: number;
  file_url: string | null;
  status: string;
  notes: string | null;
}

export interface LineItem {
  id: number;
  invoice_id: number;
  pharmacy_id: number;
  product_name: string;
  product_code: string | null;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  invoice_date: Date;
  category: string | null;
}

export async function getPharmacies(): Promise<Pharmacy[]> {
  const result = await sql<Pharmacy>`
    SELECT * FROM pharmacies WHERE active = true ORDER BY name
  `;
  return result.rows;
}

export async function createPharmacy(name: string, code?: string): Promise<Pharmacy> {
  const result = await sql<Pharmacy>`
    INSERT INTO pharmacies (name, code)
    VALUES (${name}, ${code || null})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getOrCreatePharmacy(name: string): Promise<Pharmacy> {
  const existing = await sql<Pharmacy>`
    SELECT * FROM pharmacies WHERE LOWER(name) = LOWER(${name}) LIMIT 1
  `;
  if (existing.rows.length > 0) return existing.rows[0];
  return createPharmacy(name);
}

export async function createInvoice(data: {
  pharmacy_id: number;
  invoice_number?: string;
  invoice_date: Date;
  uploaded_by?: number;
  total_amount: number;
  item_count: number;
  file_url?: string;
}): Promise<Invoice> {
  const result = await sql<Invoice>`
    INSERT INTO invoices (pharmacy_id, invoice_number, invoice_date, uploaded_by, total_amount, item_count, file_url)
    VALUES (
      ${data.pharmacy_id},
      ${data.invoice_number || null},
      ${data.invoice_date.toISOString().split('T')[0]},
      ${data.uploaded_by || null},
      ${data.total_amount},
      ${data.item_count},
      ${data.file_url || null}
    )
    RETURNING *
  `;
  return result.rows[0];
}

export async function createLineItems(items: {
  invoice_id: number;
  pharmacy_id: number;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit_price?: number;
  total_price: number;
  invoice_date: Date;
  category?: string;
}[]): Promise<void> {
  for (const item of items) {
    await sql`
      INSERT INTO line_items (invoice_id, pharmacy_id, product_name, product_code, quantity, unit_price, total_price, invoice_date, category)
      VALUES (
        ${item.invoice_id},
        ${item.pharmacy_id},
        ${item.product_name},
        ${item.product_code || null},
        ${item.quantity},
        ${item.unit_price || null},
        ${item.total_price},
        ${item.invoice_date.toISOString().split('T')[0]},
        ${item.category || null}
      )
    `;
  }
}

export async function getSpendByPeriod(
  period: 'day' | 'week' | 'month' | 'year',
  filters?: { pharmacy_id?: number; start_date?: Date; end_date?: Date }
): Promise<{ period: string; total: number; count: number }[]> {
  let dateFormat: string;
  switch (period) {
    case 'day': dateFormat = 'YYYY-MM-DD'; break;
    case 'week': dateFormat = 'IYYY-IW'; break;
    case 'month': dateFormat = 'YYYY-MM'; break;
    case 'year': dateFormat = 'YYYY'; break;
  }

  let query = `
    SELECT 
      TO_CHAR(invoice_date, '${dateFormat}') as period,
      SUM(total_price) as total,
      SUM(quantity) as count
    FROM line_items WHERE 1=1
  `;
  
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (filters?.pharmacy_id) {
    query += ` AND pharmacy_id = $${paramIndex++}`;
    params.push(filters.pharmacy_id);
  }
  if (filters?.start_date) {
    query += ` AND invoice_date >= $${paramIndex++}`;
    params.push(filters.start_date.toISOString().split('T')[0]);
  }
  if (filters?.end_date) {
    query += ` AND invoice_date <= $${paramIndex++}`;
    params.push(filters.end_date.toISOString().split('T')[0]);
  }

  query += ` GROUP BY TO_CHAR(invoice_date, '${dateFormat}') ORDER BY period`;

  const result = await sql.query(query, params);
  return result.rows.map(row => ({
    period: row.period,
    total: parseFloat(row.total),
    count: parseInt(row.count),
  }));
}

export async function getTopProducts(
  limit: number = 10,
  filters?: { pharmacy_id?: number; start_date?: Date; end_date?: Date }
): Promise<{ product_name: string; product_code: string | null; total_quantity: number; total_revenue: number }[]> {
  let query = `
    SELECT 
      product_name,
      product_code,
      SUM(quantity) as total_quantity,
      SUM(total_price) as total_revenue
    FROM line_items WHERE 1=1
  `;
  
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (filters?.pharmacy_id) {
    query += ` AND pharmacy_id = $${paramIndex++}`;
    params.push(filters.pharmacy_id);
  }

  query += ` GROUP BY product_name, product_code ORDER BY total_revenue DESC LIMIT $${paramIndex++}`;
  params.push(limit);

  const result = await sql.query(query, params);
  return result.rows.map(row => ({
    product_name: row.product_name,
    product_code: row.product_code,
    total_quantity: parseInt(row.total_quantity),
    total_revenue: parseFloat(row.total_revenue),
  }));
}

export async function getDashboardStats(): Promise<{
  total_spend: number;
  total_items: number;
  pharmacy_count: number;
  invoice_count: number;
  this_month_spend: number;
  last_month_spend: number;
  growth_rate: number;
}> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [totals, thisMonth, lastMonth, pharmacyCount] = await Promise.all([
    sql`SELECT COALESCE(SUM(total_price), 0) as total_spend, COALESCE(SUM(quantity), 0) as total_items FROM line_items`,
    sql`SELECT COALESCE(SUM(total_price), 0) as spend FROM line_items WHERE invoice_date >= ${thisMonthStart.toISOString().split('T')[0]}`,
    sql`SELECT COALESCE(SUM(total_price), 0) as spend FROM line_items WHERE invoice_date >= ${lastMonthStart.toISOString().split('T')[0]} AND invoice_date <= ${lastMonthEnd.toISOString().split('T')[0]}`,
    sql`SELECT COUNT(DISTINCT pharmacy_id) as count FROM line_items`,
  ]);

  const invoiceCount = await sql`SELECT COUNT(*) as count FROM invoices`;

  const thisMonthSpend = parseFloat(thisMonth.rows[0].spend);
  const lastMonthSpend = parseFloat(lastMonth.rows[0].spend);
  const growthRate = lastMonthSpend > 0 ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

  return {
    total_spend: parseFloat(totals.rows[0].total_spend),
    total_items: parseInt(totals.rows[0].total_items),
    pharmacy_count: parseInt(pharmacyCount.rows[0].count),
    invoice_count: parseInt(invoiceCount.rows[0].count),
    this_month_spend: thisMonthSpend,
    last_month_spend: lastMonthSpend,
    growth_rate: growthRate,
  };
}

