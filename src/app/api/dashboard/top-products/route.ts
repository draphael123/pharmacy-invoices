import { NextRequest, NextResponse } from 'next/server';
import { getTopProducts } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const pharmacyId = searchParams.get('pharmacy_id');
    
    const filters: { pharmacy_id?: number } = {};
    if (pharmacyId) filters.pharmacy_id = parseInt(pharmacyId);

    const data = await getTopProducts(limit, filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching top products:', error);
    return NextResponse.json({ error: 'Failed to fetch top products' }, { status: 500 });
  }
}

