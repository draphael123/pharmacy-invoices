import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        product_name, product_code,
        SUM(quantity) as total_quantity,
        SUM(total_price) as total_revenue,
        AVG(unit_price) as avg_unit_price,
        MIN(invoice_date) as first_seen,
        MAX(invoice_date) as last_seen
      FROM line_items
      GROUP BY product_name, product_code
      ORDER BY SUM(total_price) DESC
    `;

    return NextResponse.json(result.rows.map((row) => ({
      product_name: row.product_name,
      product_code: row.product_code,
      total_quantity: parseInt(row.total_quantity),
      total_revenue: parseFloat(row.total_revenue),
      avg_unit_price: parseFloat(row.avg_unit_price) || 0,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
    })));
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

