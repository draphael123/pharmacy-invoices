import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ['date', 'invoice_date', 'invoicedate', 'inv_date', 'order_date', 'orderdate', 'transaction_date', 'trans_date', 'sale_date', 'saledate', 'created', 'created_at', 'ship_date', 'shipped_date'],
  productName: ['product', 'product_name', 'productname', 'item', 'item_name', 'itemname', 'description', 'desc', 'drug', 'drug_name', 'medication', 'med_name', 'name', 'item_dispensed', 'itemdispensed', 'ordered_item_name', 'ordereditemname'],
  productCode: ['code', 'product_code', 'productcode', 'item_code', 'itemcode', 'sku', 'ndc', 'upc', 'barcode', 'part_number', 'partnumber', 'id', 'product_id', 'rx_number', 'rxnumber', 'rx', 'order_id', 'orderid'],
  quantity: ['quantity', 'qty', 'units', 'count', 'num', 'number', 'qty_sold', 'quantity_sold', 'ordered', 'qty_ordered', 'ordered_quantity', 'orderedquantity'],
  unitPrice: ['unit_price', 'unitprice', 'price', 'unit_cost', 'unitcost', 'cost', 'price_each', 'rate', 'unit'],
  totalPrice: ['total', 'total_price', 'totalprice', 'line_total', 'linetotal', 'amount', 'total_amount', 'totalamount', 'subtotal', 'sub_total', 'extended_price', 'ext_price', 'total_cost', 'totalcost', 'sum', 'revenue'],
  pharmacy: ['pharmacy', 'ar_account', 'araccount', 'billing_account', 'billingaccount', 'account', 'customer', 'client'],
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

async function parseExcel(buffer: ArrayBuffer): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { 
    raw: false,
    defval: ''
  });
  
  if (jsonData.length === 0) {
    return { headers: [], data: [] };
  }
  
  const headers = Object.keys(jsonData[0]);
  return { headers, data: jsonData };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    let headers: string[] = [];
    let previewData: Record<string, string>[] = [];
    let rowCount = 0;

    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const parsed = await parseExcel(buffer);
      headers = parsed.headers;
      previewData = parsed.data.slice(0, 5);
      rowCount = parsed.data.length;
    } else {
      // CSV parsing
      const text = await file.text();
      
      return new Promise<NextResponse>((resolve) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          preview: 10,
          complete: (results) => {
            headers = results.meta.fields || [];
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
    }

    const detectedMapping = detectColumnMappings(headers);
    
    return NextResponse.json({
      headers,
      preview: previewData,
      detectedMapping,
      rowCount,
    });
  } catch (error) {
    console.error('Error parsing file:', error);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
