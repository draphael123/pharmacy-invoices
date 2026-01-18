import { NextRequest, NextResponse } from 'next/server';
import { getSpendByPeriod } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'month') as 'day' | 'week' | 'month' | 'year';
    const pharmacyId = searchParams.get('pharmacy_id');
    
    const filters: { pharmacy_id?: number } = {};
    if (pharmacyId) filters.pharmacy_id = parseInt(pharmacyId);

    const data = await getSpendByPeriod(period, filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching spend data:', error);
    return NextResponse.json({ error: 'Failed to fetch spend data' }, { status: 500 });
  }
}

