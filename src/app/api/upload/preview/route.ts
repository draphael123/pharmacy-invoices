import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ['date', 'invoice_date', 'invoicedate', 'inv_date', 'order_date', 'orderdate', 'transaction_date', 'trans_date', 'sale_date', 'saledate', 'created', 'created_at', 'ship_date', 'shipped_date', 'fill_date', 'filldate', 'dispense_date'],
  productName: ['product', 'product_name', 'productname', 'item', 'item_name', 'itemname', 'description', 'desc', 'drug', 'drug_name', 'medication', 'medication_name', 'medicationname', 'med_name', 'name', 'item_dispensed', 'itemdispensed', 'ordered_item_name', 'ordereditemname', 'rx_name'],
  productCode: ['code', 'product_code', 'productcode', 'item_code', 'itemcode', 'sku', 'ndc', 'upc', 'barcode', 'part_number', 'partnumber', 'product_id', 'rx_number', 'rxnumber', 'rx', 'order_id', 'orderid'],
  quantity: ['quantity', 'qty', 'units', 'count', 'num', 'number', 'qty_sold', 'quantity_sold', 'ordered', 'qty_ordered', 'ordered_quantity', 'orderedquantity', 'rx_quantity', 'rxquantity', 'rx_qty', 'rxqty', 'dispense_qty', 'dispensed'],
  unitPrice: ['unit_price', 'unitprice', 'price', 'unit_cost', 'unitcost', 'cost', 'price_each', 'rate', 'unit'],
  totalPrice: ['total', 'total_price', 'totalprice', 'line_total', 'linetotal', 'amount', 'total_amount', 'totalamount', 'subtotal', 'sub_total', 'extended_price', 'ext_price', 'total_cost', 'totalcost', 'sum', 'revenue'],
  pharmacy: ['pharmacy', 'ar_account', 'araccount', 'billing_account', 'billingaccount', 'account', 'customer', 'client', 'location'],
};

function detectColumnMappings(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'));

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      // Check for exact match or contains pattern
      if (patterns.some(p => header === p || header.includes(p) || header.startsWith(p) || header.endsWith(p))) {
        mapping[field] = headers[i];
        break;
      }
    }
  }
  return mapping;
}

// Check if a row looks like a title/header row (single merged cell or report title)
function isLikelyTitleRow(row: Record<string, string>): boolean {
  const values = Object.values(row).filter(v => v && v.toString().trim() !== '');
  // If only one or two cells have values and the rest are empty, likely a title row
  if (values.length <= 2) {
    const combined = values.join(' ').toLowerCase();
    // Check for common title patterns
    if (combined.includes('report') || combined.includes('summary') || 
        combined.includes('billing') || combined.includes('invoice') ||
        combined.includes('statement') || combined.length > 50) {
      return true;
    }
  }
  return false;
}

// Check if headers look like actual column headers (not a title row)
function looksLikeHeaders(headers: string[]): boolean {
  const validHeaders = headers.filter(h => h && h.trim() !== '' && !h.startsWith('__EMPTY'));
  // Real headers should have multiple non-empty values
  if (validHeaders.length < 3) return false;
  
  // Check if any common column patterns match
  const normalizedHeaders = validHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const commonPatterns = ['id', 'name', 'date', 'quantity', 'qty', 'price', 'total', 'product', 'item', 'order', 'medication', 'location', 'patient'];
  const matchCount = normalizedHeaders.filter(h => commonPatterns.some(p => h.includes(p))).length;
  
  return matchCount >= 2;
}

async function parseExcel(buffer: ArrayBuffer): Promise<{ headers: string[]; data: Record<string, string>[]; skippedRows: number }> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // First, try to parse with headers
  let jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { 
    raw: false,
    defval: ''
  });
  
  if (jsonData.length === 0) {
    return { headers: [], data: [], skippedRows: 0 };
  }
  
  let headers = Object.keys(jsonData[0]);
  let skippedRows = 0;
  
  // Check if first row looks like a title row
  if (!looksLikeHeaders(headers) || isLikelyTitleRow(jsonData[0])) {
    // Parse without headers to get raw data
    const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { 
      raw: false,
      defval: '',
      header: 1 // Use array format
    });
    
    // Find the actual header row (usually within first 5 rows)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i];
      if (Array.isArray(row) && row.length >= 3) {
        const nonEmpty = row.filter(cell => cell && cell.toString().trim() !== '');
        if (nonEmpty.length >= 3 && looksLikeHeaders(row.map(String))) {
          headerRowIndex = i;
          break;
        }
      }
    }
    
    skippedRows = headerRowIndex;
    
    // Re-parse with the correct header row
    if (headerRowIndex > 0) {
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      range.s.r = headerRowIndex; // Start from header row
      sheet['!ref'] = XLSX.utils.encode_range(range);
      
      jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { 
        raw: false,
        defval: ''
      });
      
      if (jsonData.length > 0) {
        headers = Object.keys(jsonData[0]);
      }
    }
  }
  
  // Clean up __EMPTY column names
  const cleanHeaders = headers.map((h, i) => {
    if (h.startsWith('__EMPTY')) {
      return `Column_${i + 1}`;
    }
    return h;
  });
  
  // Remap data with clean headers
  const cleanData = jsonData.map(row => {
    const newRow: Record<string, string> = {};
    headers.forEach((h, i) => {
      newRow[cleanHeaders[i]] = row[h] || '';
    });
    return newRow;
  });
  
  return { headers: cleanHeaders, data: cleanData, skippedRows };
}

async function parsePDF(buffer: Buffer): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;
    
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const data: Record<string, string>[] = [];
    let headers: string[] = [];
    
    let headerIndex = -1;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('date') || line.includes('product') || line.includes('item') || 
          line.includes('quantity') || line.includes('total') || line.includes('description')) {
        headerIndex = i;
        break;
      }
    }
    
    if (headerIndex >= 0) {
      headers = lines[headerIndex].split(/\s{2,}|\t/).map((h: string) => h.trim()).filter((h: string) => h);
      
      for (let i = headerIndex + 1; i < lines.length; i++) {
        const values = lines[i].split(/\s{2,}|\t/).map((v: string) => v.trim()).filter((v: string) => v);
        if (values.length >= 2) {
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          data.push(row);
        }
      }
    } else {
      headers = ['Line', 'Content'];
      lines.forEach((line: string, idx: number) => {
        data.push({ Line: String(idx + 1), Content: line });
      });
    }
    
    return { headers, data };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Could not parse PDF file');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isPDF = fileName.endsWith('.pdf');
    
    let headers: string[] = [];
    let previewData: Record<string, string>[] = [];
    let rowCount = 0;
    let skippedRows = 0;

    if (isPDF) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parsePDF(buffer);
      headers = parsed.headers;
      previewData = parsed.data.slice(0, 5);
      rowCount = parsed.data.length;
    } else if (isExcel) {
      const buffer = await file.arrayBuffer();
      const parsed = await parseExcel(buffer);
      headers = parsed.headers;
      previewData = parsed.data.slice(0, 5);
      rowCount = parsed.data.length;
      skippedRows = parsed.skippedRows;
    } else {
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
      skippedRows,
      isPDF,
    });
  } catch (error) {
    console.error('Error parsing file:', error);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
