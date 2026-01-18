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

export interface ProductCategory {
  id: number;
  name: string;
  description: string | null;
  color: string;
  keywords: string[];
}

export interface UploadHistory {
  id: number;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  pharmacy_id: number | null;
  pharmacy_name: string | null;
  row_count: number | null;
  invoice_count: number | null;
  item_count: number | null;
  status: string;
  error_message: string | null;
  uploaded_at: Date;
}

export interface Alert {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  product_name: string | null;
  pharmacy_id: number | null;
  threshold_value: number | null;
  actual_value: number | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: Date;
}

// ============ PHARMACY FUNCTIONS ============

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

// ============ INVOICE & LINE ITEM FUNCTIONS ============

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
    // Auto-categorize if no category provided
    const category = item.category || await autoCategorizeProduc(item.product_name);
    
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
        ${category}
      )
    `;
  }
}

// ============ CATEGORY FUNCTIONS ============

export async function getCategories(): Promise<ProductCategory[]> {
  const result = await sql<ProductCategory>`
    SELECT * FROM product_categories ORDER BY name
  `;
  return result.rows;
}

export async function autoCategorizeProduc(productName: string): Promise<string> {
  const categories = await sql<ProductCategory>`SELECT * FROM product_categories`;
  const lowerName = productName.toLowerCase();
  
  for (const cat of categories.rows) {
    if (cat.keywords && cat.keywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
      return cat.name;
    }
  }
  return 'Other';
}

export async function getCategoryStats(filters?: { 
  pharmacy_id?: number; 
  start_date?: Date; 
  end_date?: Date 
}): Promise<{ category: string; total_quantity: number; total_revenue: number; product_count: number }[]> {
  let query = `
    SELECT 
      COALESCE(category, 'Other') as category,
      SUM(quantity) as total_quantity,
      SUM(total_price) as total_revenue,
      COUNT(DISTINCT product_name) as product_count
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

  query += ` GROUP BY category ORDER BY total_revenue DESC`;

  const result = await sql.query(query, params);
  return result.rows.map(row => ({
    category: row.category,
    total_quantity: parseInt(row.total_quantity),
    total_revenue: parseFloat(row.total_revenue),
    product_count: parseInt(row.product_count),
  }));
}

// ============ ANALYTICS FUNCTIONS ============

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
): Promise<{ product_name: string; product_code: string | null; total_quantity: number; total_revenue: number; category: string }[]> {
  let query = `
    SELECT 
      product_name,
      product_code,
      COALESCE(category, 'Other') as category,
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
  if (filters?.start_date) {
    query += ` AND invoice_date >= $${paramIndex++}`;
    params.push(filters.start_date.toISOString().split('T')[0]);
  }
  if (filters?.end_date) {
    query += ` AND invoice_date <= $${paramIndex++}`;
    params.push(filters.end_date.toISOString().split('T')[0]);
  }

  query += ` GROUP BY product_name, product_code, category ORDER BY total_revenue DESC LIMIT $${paramIndex++}`;
  params.push(limit);

  const result = await sql.query(query, params);
  return result.rows.map(row => ({
    product_name: row.product_name,
    product_code: row.product_code,
    total_quantity: parseInt(row.total_quantity),
    total_revenue: parseFloat(row.total_revenue),
    category: row.category,
  }));
}

export async function getDashboardStats(filters?: { start_date?: Date; end_date?: Date }): Promise<{
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

  let dateFilter = '';
  const params: string[] = [];
  
  if (filters?.start_date && filters?.end_date) {
    dateFilter = ` AND invoice_date >= $1 AND invoice_date <= $2`;
    params.push(filters.start_date.toISOString().split('T')[0], filters.end_date.toISOString().split('T')[0]);
  }

  const totalsQuery = `SELECT COALESCE(SUM(total_price), 0) as total_spend, COALESCE(SUM(quantity), 0) as total_items FROM line_items WHERE 1=1${dateFilter}`;
  const totals = await sql.query(totalsQuery, params);

  const [thisMonth, lastMonth, pharmacyCount] = await Promise.all([
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

// ============ UPLOAD HISTORY FUNCTIONS ============

export async function createUploadHistory(data: {
  file_name: string;
  file_type?: string;
  file_size?: number;
  pharmacy_id?: number;
  pharmacy_name?: string;
  row_count?: number;
  invoice_count?: number;
  item_count?: number;
  status?: string;
  error_message?: string;
}): Promise<UploadHistory> {
  const result = await sql<UploadHistory>`
    INSERT INTO upload_history (file_name, file_type, file_size, pharmacy_id, pharmacy_name, row_count, invoice_count, item_count, status, error_message)
    VALUES (
      ${data.file_name},
      ${data.file_type || null},
      ${data.file_size || null},
      ${data.pharmacy_id || null},
      ${data.pharmacy_name || null},
      ${data.row_count || null},
      ${data.invoice_count || null},
      ${data.item_count || null},
      ${data.status || 'completed'},
      ${data.error_message || null}
    )
    RETURNING *
  `;
  return result.rows[0];
}

export async function getUploadHistory(limit: number = 20): Promise<UploadHistory[]> {
  const result = await sql<UploadHistory>`
    SELECT * FROM upload_history ORDER BY uploaded_at DESC LIMIT ${limit}
  `;
  return result.rows;
}

// ============ ALERT FUNCTIONS ============

export async function createAlert(data: {
  type: string;
  severity?: string;
  title: string;
  message?: string;
  product_name?: string;
  pharmacy_id?: number;
  threshold_value?: number;
  actual_value?: number;
}): Promise<Alert> {
  const result = await sql<Alert>`
    INSERT INTO alerts (type, severity, title, message, product_name, pharmacy_id, threshold_value, actual_value)
    VALUES (
      ${data.type},
      ${data.severity || 'info'},
      ${data.title},
      ${data.message || null},
      ${data.product_name || null},
      ${data.pharmacy_id || null},
      ${data.threshold_value || null},
      ${data.actual_value || null}
    )
    RETURNING *
  `;
  return result.rows[0];
}

export async function getAlerts(unreadOnly: boolean = false): Promise<Alert[]> {
  if (unreadOnly) {
    const result = await sql<Alert>`
      SELECT * FROM alerts WHERE is_read = false AND is_dismissed = false ORDER BY created_at DESC
    `;
    return result.rows;
  }
  const result = await sql<Alert>`
    SELECT * FROM alerts WHERE is_dismissed = false ORDER BY created_at DESC LIMIT 50
  `;
  return result.rows;
}

export async function markAlertRead(id: number): Promise<void> {
  await sql`UPDATE alerts SET is_read = true WHERE id = ${id}`;
}

export async function dismissAlert(id: number): Promise<void> {
  await sql`UPDATE alerts SET is_dismissed = true WHERE id = ${id}`;
}

// ============ ANOMALY DETECTION ============

export async function detectAnomalies(): Promise<void> {
  // Detect demand spikes (>50% increase from average)
  const spikes = await sql`
    WITH product_avg AS (
      SELECT product_name, AVG(quantity) as avg_qty
      FROM line_items
      WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY product_name
    ),
    recent AS (
      SELECT product_name, SUM(quantity) as recent_qty
      FROM line_items
      WHERE invoice_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY product_name
    )
    SELECT r.product_name, r.recent_qty, p.avg_qty
    FROM recent r
    JOIN product_avg p ON r.product_name = p.product_name
    WHERE r.recent_qty > p.avg_qty * 1.5 AND p.avg_qty > 5
  `;

  for (const spike of spikes.rows) {
    // Check if alert already exists
    const existing = await sql`
      SELECT id FROM alerts 
      WHERE type = 'demand_spike' 
      AND product_name = ${spike.product_name}
      AND created_at > CURRENT_DATE - INTERVAL '7 days'
    `;
    
    if (existing.rows.length === 0) {
      await createAlert({
        type: 'demand_spike',
        severity: 'warning',
        title: `Demand spike: ${spike.product_name}`,
        message: `Demand increased ${Math.round((spike.recent_qty / spike.avg_qty - 1) * 100)}% above average`,
        product_name: spike.product_name,
        threshold_value: spike.avg_qty,
        actual_value: spike.recent_qty,
      });
    }
  }
}

// ============ REORDER RECOMMENDATIONS ============

export async function getReorderRecommendations(): Promise<{
  product_name: string;
  avg_daily_demand: number;
  days_supply_pattern: number;
  last_order_date: string;
  estimated_reorder_date: string;
  urgency: 'low' | 'medium' | 'high';
}[]> {
  const result = await sql`
    WITH demand AS (
      SELECT 
        product_name,
        AVG(quantity) as avg_qty,
        MAX(invoice_date) as last_order,
        MODE() WITHIN GROUP (ORDER BY quantity) as typical_qty
      FROM line_items
      WHERE invoice_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY product_name
      HAVING COUNT(*) >= 2
    )
    SELECT 
      product_name,
      avg_qty,
      last_order,
      typical_qty,
      CURRENT_DATE - last_order as days_since_order
    FROM demand
    ORDER BY days_since_order DESC
    LIMIT 20
  `;

  return result.rows.map(row => {
    const avgDailyDemand = parseFloat(row.avg_qty) / 30;
    const daysSinceOrder = parseInt(row.days_since_order);
    const typicalSupply = 84; // Assume 84-day supply pattern
    const daysUntilReorder = typicalSupply - daysSinceOrder;
    
    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (daysUntilReorder < 7) urgency = 'high';
    else if (daysUntilReorder < 21) urgency = 'medium';

    const reorderDate = new Date();
    reorderDate.setDate(reorderDate.getDate() + Math.max(0, daysUntilReorder));

    return {
      product_name: row.product_name,
      avg_daily_demand: avgDailyDemand,
      days_supply_pattern: typicalSupply,
      last_order_date: row.last_order,
      estimated_reorder_date: reorderDate.toISOString().split('T')[0],
      urgency,
    };
  });
}

// ============ PHARMACY COMPARISON ============

export async function getPharmacyComparison(filters?: { start_date?: Date; end_date?: Date }): Promise<{
  pharmacy_id: number;
  pharmacy_name: string;
  total_spend: number;
  total_items: number;
  invoice_count: number;
  avg_order_value: number;
  top_category: string;
  growth_rate: number;
}[]> {
  let dateFilter = '';
  const params: string[] = [];
  
  if (filters?.start_date && filters?.end_date) {
    dateFilter = ` AND li.invoice_date >= $1 AND li.invoice_date <= $2`;
    params.push(filters.start_date.toISOString().split('T')[0], filters.end_date.toISOString().split('T')[0]);
  }

  const query = `
    SELECT 
      p.id as pharmacy_id,
      p.name as pharmacy_name,
      COALESCE(SUM(li.total_price), 0) as total_spend,
      COALESCE(SUM(li.quantity), 0) as total_items,
      COUNT(DISTINCT li.invoice_id) as invoice_count,
      CASE WHEN COUNT(DISTINCT li.invoice_id) > 0 
        THEN COALESCE(SUM(li.total_price), 0) / COUNT(DISTINCT li.invoice_id) 
        ELSE 0 END as avg_order_value
    FROM pharmacies p
    LEFT JOIN line_items li ON p.id = li.pharmacy_id
    WHERE p.active = true${dateFilter}
    GROUP BY p.id, p.name
    ORDER BY total_spend DESC
  `;

  const result = await sql.query(query, params);
  
  return result.rows.map(row => ({
    pharmacy_id: row.pharmacy_id,
    pharmacy_name: row.pharmacy_name,
    total_spend: parseFloat(row.total_spend),
    total_items: parseInt(row.total_items),
    invoice_count: parseInt(row.invoice_count),
    avg_order_value: parseFloat(row.avg_order_value),
    top_category: 'Other', // Would need another query to get this
    growth_rate: 0, // Would need historical comparison
  }));
}

// ============ SEASONAL ANALYSIS ============

export async function getSeasonalTrends(productName?: string): Promise<{
  month: number;
  month_name: string;
  avg_quantity: number;
  avg_spend: number;
}[]> {
  let query = `
    SELECT 
      EXTRACT(MONTH FROM invoice_date) as month,
      TO_CHAR(invoice_date, 'Mon') as month_name,
      AVG(quantity) as avg_quantity,
      AVG(total_price) as avg_spend
    FROM line_items
    WHERE invoice_date >= CURRENT_DATE - INTERVAL '2 years'
  `;

  const params: string[] = [];
  if (productName) {
    query += ` AND product_name = $1`;
    params.push(productName);
  }

  query += ` GROUP BY EXTRACT(MONTH FROM invoice_date), TO_CHAR(invoice_date, 'Mon') ORDER BY month`;

  const result = await sql.query(query, params);
  return result.rows.map(row => ({
    month: parseInt(row.month),
    month_name: row.month_name,
    avg_quantity: parseFloat(row.avg_quantity),
    avg_spend: parseFloat(row.avg_spend),
  }));
}

// ============ EXPORT FUNCTIONS ============

export async function getExportData(filters?: {
  start_date?: Date;
  end_date?: Date;
  pharmacy_id?: number;
  category?: string;
}): Promise<{
  date: string;
  pharmacy: string;
  product_name: string;
  product_code: string | null;
  category: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
}[]> {
  let query = `
    SELECT 
      li.invoice_date as date,
      p.name as pharmacy,
      li.product_name,
      li.product_code,
      COALESCE(li.category, 'Other') as category,
      li.quantity,
      li.unit_price,
      li.total_price
    FROM line_items li
    JOIN pharmacies p ON li.pharmacy_id = p.id
    WHERE 1=1
  `;

  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (filters?.start_date) {
    query += ` AND li.invoice_date >= $${paramIndex++}`;
    params.push(filters.start_date.toISOString().split('T')[0]);
  }
  if (filters?.end_date) {
    query += ` AND li.invoice_date <= $${paramIndex++}`;
    params.push(filters.end_date.toISOString().split('T')[0]);
  }
  if (filters?.pharmacy_id) {
    query += ` AND li.pharmacy_id = $${paramIndex++}`;
    params.push(filters.pharmacy_id);
  }
  if (filters?.category) {
    query += ` AND li.category = $${paramIndex++}`;
    params.push(filters.category);
  }

  query += ` ORDER BY li.invoice_date DESC, p.name, li.product_name`;

  const result = await sql.query(query, params);
  return result.rows;
}
