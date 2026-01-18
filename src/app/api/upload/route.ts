import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getOrCreatePharmacy, createInvoice, createLineItems, createUploadHistory, detectAnomalies } from '@/lib/db';

interface ColumnMapping {
  date?: string;  // Now optional
  productName: string;
  productCode?: string;
  quantity?: string;
  unitPrice?: string;
  totalPrice?: string;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  
  // Handle Excel date format (datetime string)
  const dateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})\s/);
  if (dateTimeMatch) {
    return new Date(parseInt(dateTimeMatch[1]), parseInt(dateTimeMatch[2]) - 1, parseInt(dateTimeMatch[3]));
  }
  
  // Handle various date formats
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return new Date(parseInt(dateOnlyMatch[1]), parseInt(dateOnlyMatch[2]) - 1, parseInt(dateOnlyMatch[3]));
  }
  
  const nativeDate = new Date(value);
  if (!isNaN(nativeDate.getTime())) return nativeDate;

  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let year = parseInt(usMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
  }
  return null;
}

// Try to extract a date from the filename
function extractDateFromFilename(filename: string): Date | null {
  // Pattern: 2025-11-16 or 2025_11_16
  const isoMatch = filename.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  
  // Pattern: 11-16-2025 or 11_16_2025
  const usMatch = filename.match(/(\d{2})[-_](\d{2})[-_](\d{4})/);
  if (usMatch) {
    return new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
  }
  
  return null;
}

function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = value.toString().replace(/[$€£¥₹,\s]/g, '').replace(/[()]/g, '-').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Check if headers look like actual column headers (not a title row)
function looksLikeHeaders(headers: string[]): boolean {
  const validHeaders = headers.filter(h => h && h.trim() !== '' && !h.startsWith('__EMPTY'));
  if (validHeaders.length < 3) return false;
  
  const normalizedHeaders = validHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const commonPatterns = ['id', 'name', 'date', 'quantity', 'qty', 'price', 'total', 'product', 'item', 'order', 'medication', 'location', 'patient'];
  const matchCount = normalizedHeaders.filter(h => commonPatterns.some(p => h.includes(p))).length;
  
  return matchCount >= 2;
}

async function parseExcel(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // First try regular parsing
  let jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });
  
  if (jsonData.length === 0) {
    return [];
  }
  
  let headers = Object.keys(jsonData[0]);
  
  // Check if first row looks like a title row
  if (!looksLikeHeaders(headers)) {
    // Parse without headers to get raw data
    const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { 
      raw: false,
      defval: '',
      header: 1
    });
    
    // Find the actual header row
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
    
    // Re-parse with the correct header row
    if (headerRowIndex > 0) {
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      range.s.r = headerRowIndex;
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
  
  // Remap data with clean headers if needed
  if (cleanHeaders.some((h, i) => h !== headers[i])) {
    return jsonData.map(row => {
      const newRow: Record<string, string> = {};
      headers.forEach((h, i) => {
        newRow[cleanHeaders[i]] = row[h] || '';
      });
      return newRow;
    });
  }
  
  return jsonData;
}

async function parsePDF(buffer: Buffer): Promise<Record<string, string>[]> {
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
  }
  
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pharmacyName = formData.get('pharmacyName') as string;
    const mappingJson = formData.get('mapping') as string;

    if (!file || !pharmacyName || !mappingJson) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const mapping: ColumnMapping = JSON.parse(mappingJson);
    
    // Only product name is strictly required now
    if (!mapping.productName) {
      return NextResponse.json({ error: 'Product Name mapping is required' }, { status: 400 });
    }

    const pharmacy = await getOrCreatePharmacy(pharmacyName);
    
    const fileName = file.name.toLowerCase();
    const originalFileName = file.name;
    const fileExt = fileName.split('.').pop() || '';
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isPDF = fileName.endsWith('.pdf');
    
    // Try to extract date from filename for files without date column
    const filenameDate = extractDateFromFilename(originalFileName);
    const fallbackDate = filenameDate || new Date();
    
    let rows: Record<string, string>[] = [];
    
    try {
      if (isPDF) {
        const buffer = Buffer.from(await file.arrayBuffer());
        rows = await parsePDF(buffer);
      } else if (isExcel) {
        const buffer = await file.arrayBuffer();
        rows = await parseExcel(buffer);
      } else {
        const text = await file.text();
        const result = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
          });
        });
        rows = result.data;
      }
    } catch (parseError) {
      await createUploadHistory({
        file_name: originalFileName,
        file_type: fileExt,
        file_size: file.size,
        pharmacy_id: pharmacy.id,
        pharmacy_name: pharmacy.name,
        row_count: 0,
        status: 'failed',
        error_message: parseError instanceof Error ? parseError.message : 'Parse error',
      });
      throw parseError;
    }

    if (rows.length === 0) {
      await createUploadHistory({
        file_name: originalFileName,
        file_type: fileExt,
        file_size: file.size,
        pharmacy_id: pharmacy.id,
        pharmacy_name: pharmacy.name,
        row_count: 0,
        status: 'failed',
        error_message: 'No data rows found in file',
      });
      return NextResponse.json({ error: 'No data rows found in file' }, { status: 400 });
    }

    const invoiceMap = new Map<string, {
      productName: string;
      productCode?: string;
      quantity: number;
      unitPrice?: number;
      totalPrice: number;
      date: Date;
    }[]>();

    let skippedRows = 0;

    for (const row of rows) {
      // Get date from column or use fallback
      let date: Date | null = null;
      if (mapping.date && row[mapping.date]) {
        date = parseDate(row[mapping.date]);
      }
      if (!date) {
        date = fallbackDate;
      }

      const productName = row[mapping.productName];
      if (!productName || productName.trim() === '') {
        skippedRows++;
        continue;
      }

      const quantity = mapping.quantity ? parseNumber(row[mapping.quantity]) : 1;
      const unitPrice = mapping.unitPrice ? parseNumber(row[mapping.unitPrice]) : undefined;
      
      let totalPrice = mapping.totalPrice ? parseNumber(row[mapping.totalPrice]) : 0;
      if (!totalPrice && unitPrice && quantity) {
        totalPrice = unitPrice * quantity;
      }
      if (!totalPrice) {
        // If no price info, just use quantity as the "value"
        totalPrice = quantity;
      }

      const item = {
        productName: productName.trim(),
        productCode: mapping.productCode ? row[mapping.productCode]?.trim() : undefined,
        quantity: quantity || 1,
        unitPrice: unitPrice || (totalPrice && quantity ? totalPrice / quantity : undefined),
        totalPrice,
        date,
      };

      const dateKey = date.toISOString().split('T')[0];
      if (!invoiceMap.has(dateKey)) invoiceMap.set(dateKey, []);
      invoiceMap.get(dateKey)!.push(item);
    }

    if (invoiceMap.size === 0) {
      await createUploadHistory({
        file_name: originalFileName,
        file_type: fileExt,
        file_size: file.size,
        pharmacy_id: pharmacy.id,
        pharmacy_name: pharmacy.name,
        row_count: rows.length,
        status: 'failed',
        error_message: 'No valid data rows found (check Product Name mapping)',
      });
      return NextResponse.json({ 
        error: 'No valid data rows found. Make sure the Product Name column is mapped correctly.',
        skippedRows 
      }, { status: 400 });
    }

    let totalInvoices = 0;
    let totalItems = 0;

    for (const [dateKey, items] of invoiceMap.entries()) {
      const invoiceTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const invoiceDate = new Date(dateKey);

      const invoice = await createInvoice({
        pharmacy_id: pharmacy.id,
        invoice_date: invoiceDate,
        total_amount: invoiceTotal,
        item_count: items.length,
      });

      await createLineItems(
        items.map((item) => ({
          invoice_id: invoice.id,
          pharmacy_id: pharmacy.id,
          product_name: item.productName,
          product_code: item.productCode,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          invoice_date: item.date,
        }))
      );

      totalInvoices++;
      totalItems += items.length;
    }

    // Log successful upload
    await createUploadHistory({
      file_name: originalFileName,
      file_type: fileExt,
      file_size: file.size,
      pharmacy_id: pharmacy.id,
      pharmacy_name: pharmacy.name,
      row_count: rows.length,
      invoice_count: totalInvoices,
      item_count: totalItems,
      status: 'completed',
    });

    // Run anomaly detection after upload
    try {
      await detectAnomalies();
    } catch (e) {
      console.error('Anomaly detection failed:', e);
    }

    return NextResponse.json({
      success: true,
      pharmacy: pharmacy.name,
      invoices: totalInvoices,
      items: totalItems,
      skippedRows,
      dateSource: mapping.date ? 'column' : (filenameDate ? 'filename' : 'current'),
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file', details: String(error) }, { status: 500 });
  }
}
