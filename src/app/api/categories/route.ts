import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getCategoryStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('include_stats') === 'true';
    const pharmacyId = searchParams.get('pharmacy_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (includeStats) {
      const filters: { pharmacy_id?: number; start_date?: Date; end_date?: Date } = {};
      if (pharmacyId) filters.pharmacy_id = parseInt(pharmacyId);
      if (startDate) filters.start_date = new Date(startDate);
      if (endDate) filters.end_date = new Date(endDate);

      const stats = await getCategoryStats(filters);
      return NextResponse.json(stats);
    }

    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

