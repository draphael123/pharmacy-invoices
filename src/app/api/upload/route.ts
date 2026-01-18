import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { getOrCreatePharmacy, createInvoice, createLineItems } from '@/lib/db';

interface ColumnMapping {
  date: string;
  productName: string;
  productCode?: string;
  quantity?: string;
  unitPrice?: string;
  totalPrice: string;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
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
    if (!mapping.date || !mapping.productName || !mapping.totalPrice) {
      return NextResponse.json({ error: 'Missing required column mappings' }, { status: 400 });
    }

    const pharmacy = await getOrCreatePharmacy(pharmacyName);
    const text = await file.text();

    return new Promise<NextResponse>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const invoiceMap = new Map<string, {
              productName: string;
              productCode?: string;
              quantity: number;
              unitPrice?: number;
              totalPrice: number;
              date: Date;
            }[]>();

            for (const row of results.data as Record<string, string>[]) {
              const dateValue = row[mapping.date];
              const date = parseDate(dateValue);
              if (!date) continue;

              const dateKey = date.toISOString().split('T')[0];
              const productName = row[mapping.productName];
              if (!productName) continue;

              const quantity = mapping.quantity ? parseNumber(row[mapping.quantity]) : 1;
              const unitPrice = mapping.unitPrice ? parseNumber(row[mapping.unitPrice]) : undefined;
              let totalPrice = parseNumber(row[mapping.totalPrice]);

              if (!totalPrice && unitPrice && quantity) totalPrice = unitPrice * quantity;

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

            resolve(NextResponse.json({
              success: true,
              pharmacy: pharmacy.name,
              invoices: totalInvoices,
              items: totalItems,
            }));
          } catch (error) {
            console.error('Error processing CSV:', error);
            resolve(NextResponse.json({ error: 'Failed to process CSV data' }, { status: 500 }));
          }
        },
        error: (error: Error) => {
          resolve(NextResponse.json({ error: error.message }, { status: 400 }));
        },
      });
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

