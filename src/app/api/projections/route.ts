import { NextRequest, NextResponse } from 'next/server';
import { generateProjections } from '@/lib/projections';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'month') as 'week' | 'month' | 'year';
    const periods = parseInt(searchParams.get('periods') || '6');
    const pharmacyId = searchParams.get('pharmacy_id');

    const filters: { pharmacy_id?: number } = {};
    if (pharmacyId) filters.pharmacy_id = parseInt(pharmacyId);

    const projections = await generateProjections(period, periods, filters);
    return NextResponse.json(projections);
  } catch (error) {
    console.error('Error generating projections:', error);
    return NextResponse.json({ error: 'Failed to generate projections' }, { status: 500 });
  }
}

