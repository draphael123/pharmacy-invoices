import { NextRequest, NextResponse } from 'next/server';
import { getSeasonalTrends } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productName = searchParams.get('product_name') || undefined;

    const trends = await getSeasonalTrends(productName);
    return NextResponse.json(trends);
  } catch (error) {
    console.error('Error fetching seasonal trends:', error);
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}

