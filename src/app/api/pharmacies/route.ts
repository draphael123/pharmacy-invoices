import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getPharmacies, createPharmacy } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('include_stats') === 'true';

    if (includeStats) {
      const result = await sql`
        SELECT 
          p.id, p.name, p.code, p.created_at,
          COALESCE(SUM(li.total_price), 0) as total_spend,
          COUNT(DISTINCT i.id) as invoice_count,
          0 as growth_rate
        FROM pharmacies p
        LEFT JOIN invoices i ON p.id = i.pharmacy_id
        LEFT JOIN line_items li ON p.id = li.pharmacy_id
        WHERE p.active = true
        GROUP BY p.id, p.name, p.code, p.created_at
        ORDER BY p.name
      `;
      return NextResponse.json(result.rows.map((row) => ({
        ...row,
        total_spend: parseFloat(row.total_spend),
        invoice_count: parseInt(row.invoice_count),
        growth_rate: parseFloat(row.growth_rate),
      })));
    }

    const pharmacies = await getPharmacies();
    return NextResponse.json(pharmacies);
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    return NextResponse.json({ error: 'Failed to fetch pharmacies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const pharmacy = await createPharmacy(name, code);
    return NextResponse.json(pharmacy);
  } catch (error) {
    console.error('Error creating pharmacy:', error);
    return NextResponse.json({ error: 'Failed to create pharmacy' }, { status: 500 });
  }
}

