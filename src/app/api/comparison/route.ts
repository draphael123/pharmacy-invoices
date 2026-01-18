import { NextRequest, NextResponse } from 'next/server';
import { getPharmacyComparison } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const filters: { start_date?: Date; end_date?: Date } = {};
    if (startDate) filters.start_date = new Date(startDate);
    if (endDate) filters.end_date = new Date(endDate);

    const comparison = await getPharmacyComparison(filters);
    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error fetching pharmacy comparison:', error);
    return NextResponse.json({ error: 'Failed to fetch comparison' }, { status: 500 });
  }
}

