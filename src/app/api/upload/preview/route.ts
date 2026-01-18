import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ['date', 'invoice_date', 'invoicedate', 'inv_date', 'order_date', 'orderdate', 'transaction_date', 'trans_date', 'sale_date', 'saledate', 'created', 'created_at'],
  productName: ['product', 'product_name', 'productname', 'item', 'item_name', 'itemname', 'description', 'desc', 'drug', 'drug_name', 'medication', 'med_name', 'name'],
  productCode: ['code', 'product_code', 'productcode', 'item_code', 'itemcode', 'sku', 'ndc', 'upc', 'barcode', 'part_number', 'partnumber', 'id', 'product_id'],
  quantity: ['quantity', 'qty', 'amount', 'units', 'count', 'num', 'number', 'qty_sold', 'quantity_sold', 'ordered', 'qty_ordered'],
  unitPrice: ['unit_price', 'unitprice', 'price', 'unit_cost', 'unitcost', 'cost', 'price_each', 'rate', 'unit'],
  totalPrice: ['total', 'total_price', 'totalprice', 'line_total', 'linetotal', 'amount', 'total_amount', 'totalamount', 'subtotal', 'sub_total', 'extended_price', 'ext_price', 'total_cost', 'totalcost', 'sum'],
};

function detectColumnMappings(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, '_'));

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      if (patterns.some(p => header === p || header.includes(p))) {
        mapping[field] = headers[i];
        break;
      }
    }
  }
  return mapping;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const text = await file.text();

    return new Promise<NextResponse>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        preview: 10,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const detectedMapping = detectColumnMappings(headers);
          resolve(NextResponse.json({
            headers,
            preview: results.data.slice(0, 5),
            detectedMapping,
            rowCount: text.split('\n').length - 1,
          }));
        },
        error: (error: Error) => {
          resolve(NextResponse.json({ error: error.message }, { status: 400 }));
        },
      });
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 500 });
  }
}

