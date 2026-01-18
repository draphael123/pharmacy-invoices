import { NextRequest, NextResponse } from 'next/server';
import { getUploadHistory } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const history = await getUploadHistory(limit);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching upload history:', error);
    return NextResponse.json({ error: 'Failed to fetch upload history' }, { status: 500 });
  }
}

