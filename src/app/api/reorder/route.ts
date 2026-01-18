import { NextResponse } from 'next/server';
import { getReorderRecommendations } from '@/lib/db';

export async function GET() {
  try {
    const recommendations = await getReorderRecommendations();
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error fetching reorder recommendations:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}

