import { NextRequest, NextResponse } from 'next/server';
import { getExportData } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const pharmacyId = searchParams.get('pharmacy_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const category = searchParams.get('category');

    const filters: { pharmacy_id?: number; start_date?: Date; end_date?: Date; category?: string } = {};
    if (pharmacyId) filters.pharmacy_id = parseInt(pharmacyId);
    if (startDate) filters.start_date = new Date(startDate);
    if (endDate) filters.end_date = new Date(endDate);
    if (category) filters.category = category;

    const data = await getExportData(filters);

    if (format === 'csv') {
      const headers = ['Date', 'Pharmacy', 'Product Name', 'Product Code', 'Category', 'Quantity', 'Unit Price', 'Total Price'];
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        csvRows.push([
          row.date,
          `"${row.pharmacy}"`,
          `"${row.product_name}"`,
          row.product_code || '',
          row.category,
          row.quantity,
          row.unit_price || '',
          row.total_price,
        ].join(','));
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="pharmacy-data-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

