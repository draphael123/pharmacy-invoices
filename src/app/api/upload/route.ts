import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getOrCreatePharmacy, createInvoice, createLineItems } from '@/lib/db';

interface ColumnMapping {
  date: string;
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

function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = value.toString().replace(/[$€£¥₹,\s]/g, '').replace(/[()]/g, '-').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function parseExcel(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });
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
    if (!mapping.date || !mapping.productName) {
      return NextResponse.json({ error: 'Date and Product Name are required' }, { status: 400 });
    }

    const pharmacy = await getOrCreatePharmacy(pharmacyName);
    
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    let rows: Record<string, string>[] = [];
    
    if (isExcel) {
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

    const invoiceMap = new Map<string, {
      productName: string;
      productCode?: string;
      quantity: number;
      unitPrice?: number;
      totalPrice: number;
      date: Date;
    }[]>();

    for (const row of rows) {
      const dateValue = row[mapping.date];
      const date = parseDate(dateValue);
      if (!date) continue;

      const dateKey = date.toISOString().split('T')[0];
      const productName = row[mapping.productName];
      if (!productName) continue;

      const quantity = mapping.quantity ? parseNumber(row[mapping.quantity]) : 1;
      const unitPrice = mapping.unitPrice ? parseNumber(row[mapping.unitPrice]) : undefined;
      
      // Calculate total price - use provided total, or calculate from unit price, or default to quantity (for quantity-only tracking)
      let totalPrice = mapping.totalPrice ? parseNumber(row[mapping.totalPrice]) : 0;
      if (!totalPrice && unitPrice && quantity) {
        totalPrice = unitPrice * quantity;
      }
      // If no price data at all, use quantity as a proxy for tracking purposes
      if (!totalPrice) {
        totalPrice = quantity;
      }

      const item = {
        productName,
        productCode: mapping.productCode ? row[mapping.productCode] : undefined,
        quantity,
        unitPrice: unitPrice || (totalPrice && quantity ? totalPrice / quantity : undefined),
        totalPrice,
        date,
      };

      if (!invoiceMap.has(dateKey)) invoiceMap.set(dateKey, []);
      invoiceMap.get(dateKey)!.push(item);
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

    return NextResponse.json({
      success: true,
      pharmacy: pharmacy.name,
      invoices: totalInvoices,
      items: totalItems,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
