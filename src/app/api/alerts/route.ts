import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, markAlertRead, dismissAlert, detectAnomalies } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const alerts = await getAlerts(unreadOnly);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id } = body;

    if (action === 'detect') {
      await detectAnomalies();
      return NextResponse.json({ success: true, message: 'Anomaly detection completed' });
    }

    if (action === 'read' && id) {
      await markAlertRead(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'dismiss' && id) {
      await dismissAlert(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing alert action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}

