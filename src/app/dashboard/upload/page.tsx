'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ArrowRight, Loader2 } from 'lucide-react';

interface PreviewData {
  headers: string[];
  preview: Record<string, string>[];
  detectedMapping: Record<string, string>;
  rowCount: number;
}

interface ColumnMapping {
  date: string;
  productName: string;
  productCode?: string;
  quantity?: string;
  unitPrice?: string;
  totalPrice: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pharmacyName, setPharmacyName] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    productName: '',
    productCode: '',
    quantity: '',
    unitPrice: '',
    totalPrice: '',
  });
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'processing' | 'complete'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pharmacy: string; invoices: number; items: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    const fileName = droppedFile?.name.toLowerCase() || '';
    if (droppedFile && (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls'))) {
      setFile(droppedFile);
      handleFilePreview(droppedFile);
    } else {
      setError('Please upload a CSV or Excel file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleFilePreview(selectedFile);
    }
  };

  const handleFilePreview = async (file: File) => {
    setError(null);
    setStep('preview');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to preview file');
      }

      const data: PreviewData = await response.json();
      setPreview(data);
      
      setMapping({
        date: data.detectedMapping.date || '',
        productName: data.detectedMapping.productName || '',
        productCode: data.detectedMapping.productCode || '',
        quantity: data.detectedMapping.quantity || '',
        unitPrice: data.detectedMapping.unitPrice || '',
        totalPrice: data.detectedMapping.totalPrice || '',
      });

      setStep('mapping');
    } catch {
      setError('Failed to preview file. Please check the format.');
      setStep('upload');
    }
  };

  const handleUpload = async () => {
    if (!file || !pharmacyName || !mapping.date || !mapping.productName || !mapping.totalPrice) {
      setError('Please fill in all required fields');
      return;
    }

    setStep('processing');
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pharmacyName', pharmacyName);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('mapping');
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPharmacyName('');
    setPreview(null);
    setMapping({
      date: '',
      productName: '',
      productCode: '',
      quantity: '',
      unitPrice: '',
      totalPrice: '',
    });
    setStep('upload');
    setError(null);
    setResult(null);
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Upload Data</h1>
        <p className="page-subtitle">Import CSV invoice files from pharmacy partners</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-3">
        {['Upload', 'Map Columns', 'Complete'].map((label, index) => {
          const stepMap = { 0: 'upload', 1: 'mapping', 2: 'complete' };
          const currentStepIndex = step === 'preview' ? 0 : step === 'processing' ? 1 : 
            Object.values(stepMap).indexOf(step);
          const isActive = index <= currentStepIndex;
          const isComplete = index < currentStepIndex || step === 'complete';
          
          return (
            <div key={label} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isComplete ? 'bg-[#7c9a82] text-white' :
                  isActive ? 'bg-[#1a1a1a] text-white' :
                  'bg-[#e8e4df] text-[#404040]'
                }`}>
                  {isComplete ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`text-sm ${isActive ? 'text-[#1a1a1a] font-medium' : 'text-[#404040]'}`}>
                  {label}
                </span>
              </div>
              {index < 2 && (
                <div className={`w-8 h-px ${isComplete ? 'bg-[#7c9a82]' : 'bg-[#e8e4df]'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#c27272]/10 border border-[#c27272]/20 rounded-lg text-[#a05555]">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="card">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`dropzone ${isDragging ? 'active' : ''}`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#f7f5f2] border border-[#e8e4df] flex items-center justify-center">
                <Upload className="w-6 h-6 text-[#404040]" strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-[#1a1a1a] mb-1">
                  Drop your file here
                </p>
                <p className="text-sm text-[#404040]">Supports CSV and Excel (.xlsx) files</p>
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="btn btn-primary cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2" strokeWidth={1.75} />
                Select CSV or Excel File
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Step */}
      {(step === 'mapping' || step === 'preview') && preview && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#7c9a82]/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-[#5a7560]" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#1a1a1a]">{file?.name}</p>
                <p className="text-sm text-[#404040]">
                  {preview.rowCount.toLocaleString()} rows · {preview.headers.length} columns
                </p>
              </div>
              <button onClick={resetUpload} className="btn btn-secondary text-sm">
                Remove
              </button>
            </div>
          </div>

          {/* Pharmacy Name */}
          <div className="card">
            <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
              Pharmacy Name <span className="text-[#c27272]">*</span>
            </label>
            <input
              type="text"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              placeholder="Enter pharmacy name"
              className="input"
            />
          </div>

          {/* Column Mapping */}
          <div className="card">
            <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">Map Columns</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'date', label: 'Date', required: true },
                { key: 'productName', label: 'Product Name', required: true },
                { key: 'quantity', label: 'Quantity', required: false },
                { key: 'productCode', label: 'Product Code', required: false },
                { key: 'totalPrice', label: 'Total Price', required: false, hint: 'Optional - uses quantity if not provided' },
                { key: 'unitPrice', label: 'Unit Price', required: false },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                    {field.label} {field.required && <span className="text-[#c27272]">*</span>}
                  </label>
                  <select
                    value={mapping[field.key as keyof ColumnMapping] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="select"
                  >
                    <option value="">Select column...</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          <div className="card">
            <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">Preview</h3>
            <div className="overflow-x-auto">
              <table className="table text-xs">
                <thead>
                  <tr>
                    {preview.headers.map((header) => (
                      <th key={header} className="whitespace-nowrap">
                        {header}
                        {Object.values(mapping).includes(header) && (
                          <span className="ml-2 badge badge-success">mapped</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row, index) => (
                    <tr key={index}>
                      {preview.headers.map((header) => (
                        <td key={header} className="whitespace-nowrap">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-end gap-3">
            <button onClick={resetUpload} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!pharmacyName || !mapping.date || !mapping.productName}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload
              <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {/* Processing Step */}
      {step === 'processing' && (
        <div className="card">
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-8 h-8 text-[#1a1a1a] animate-spin" />
            <p className="text-sm text-[#404040]">Processing your data...</p>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && result && (
        <div className="card">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-14 h-14 rounded-xl bg-[#7c9a82]/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-[#5a7560]" />
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-[#1a1a1a] mb-1">Upload Complete</p>
              <p className="text-sm text-[#404040]">Data imported successfully</p>
            </div>

            <div className="flex gap-8 mt-4">
              <div className="text-center">
                <p className="text-2xl font-semibold tabular-nums">{result.invoices}</p>
                <p className="text-sm text-[#404040]">Invoices</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold tabular-nums">{result.items}</p>
                <p className="text-sm text-[#404040]">Items</p>
              </div>
            </div>

            <button onClick={resetUpload} className="btn btn-primary mt-4">
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
