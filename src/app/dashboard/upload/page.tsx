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
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      handleFilePreview(droppedFile);
    } else {
      setError('Please upload a CSV file');
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
      
      // Auto-fill detected mappings
      setMapping({
        date: data.detectedMapping.date || '',
        productName: data.detectedMapping.productName || '',
        productCode: data.detectedMapping.productCode || '',
        quantity: data.detectedMapping.quantity || '',
        unitPrice: data.detectedMapping.unitPrice || '',
        totalPrice: data.detectedMapping.totalPrice || '',
      });

      setStep('mapping');
    } catch (err) {
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
        <h1 className="text-3xl font-bold text-white mb-2">Upload Invoice Data</h1>
        <p className="text-slate-400">Import CSV files from your pharmacy partners</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        {['Upload', 'Preview', 'Map Columns', 'Complete'].map((label, index) => {
          const stepIndex = ['upload', 'preview', 'mapping', 'complete'].indexOf(step);
          const isActive = index <= stepIndex || (step === 'processing' && index <= 2);
          const isComplete = index < stepIndex || step === 'complete';
          
          return (
            <div key={label} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isComplete ? 'bg-emerald-500 text-white' :
                  isActive ? 'bg-cyan-500 text-slate-900' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {isComplete ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                </div>
                <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {index < 3 && (
                <div className={`w-12 h-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-5 h-5" />
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-white mb-1">
                  Drop your CSV file here
                </p>
                <p className="text-slate-400 text-sm">or click to browse</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="btn btn-primary cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Select CSV File
              </label>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
            <h4 className="text-sm font-medium text-white mb-2">Expected CSV Format</h4>
            <p className="text-xs text-slate-400 mb-3">
              Your CSV should contain columns for date, product name, and total price at minimum.
            </p>
            <code className="text-xs text-cyan-400 bg-slate-900/50 p-3 rounded-lg block overflow-x-auto">
              date,product_name,product_code,quantity,unit_price,total<br/>
              2024-01-15,Aspirin 100mg,ASP100,50,2.50,125.00
            </code>
          </div>
        </div>
      )}

      {/* Mapping Step */}
      {(step === 'mapping' || step === 'preview') && preview && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{file?.name}</p>
                <p className="text-sm text-slate-400">
                  {preview.rowCount.toLocaleString()} rows • {preview.headers.length} columns
                </p>
              </div>
              <button onClick={resetUpload} className="btn btn-secondary">
                <X className="w-4 h-4 mr-2" />
                Remove
              </button>
            </div>
          </div>

          {/* Pharmacy Name */}
          <div className="card">
            <label className="block text-sm font-medium text-white mb-2">
              Pharmacy Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              placeholder="Enter pharmacy name"
              className="input"
            />
            <p className="text-xs text-slate-400 mt-2">
              This will create a new pharmacy or match an existing one
            </p>
          </div>

          {/* Column Mapping */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Map Your Columns</h3>
            <p className="text-sm text-slate-400 mb-6">
              Match your CSV columns to the required fields. We&apos;ve auto-detected some mappings.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Date Column <span className="text-red-400">*</span>
                </label>
                <select
                  value={mapping.date}
                  onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                  className="select"
                >
                  <option value="">Select column...</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <select
                  value={mapping.productName}
                  onChange={(e) => setMapping({ ...mapping, productName: e.target.value })}
                  className="select"
                >
                  <option value="">Select column...</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Total Price <span className="text-red-400">*</span>
                </label>
                <select
                  value={mapping.totalPrice}
                  onChange={(e) => setMapping({ ...mapping, totalPrice: e.target.value })}
                  className="select"
                >
                  <option value="">Select column...</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Product Code <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <select
                  value={mapping.productCode}
                  onChange={(e) => setMapping({ ...mapping, productCode: e.target.value })}
                  className="select"
                >
                  <option value="">Select column...</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Quantity <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <select
                  value={mapping.quantity}
                  onChange={(e) => setMapping({ ...mapping, quantity: e.target.value })}
                  className="select"
                >
                  <option value="">Select column...</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Unit Price <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <select
                  value={mapping.unitPrice}
                  onChange={(e) => setMapping({ ...mapping, unitPrice: e.target.value })}
                  className="select"
                >
                  <option value="">Select column...</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Data Preview</h3>
            <div className="overflow-x-auto">
              <table className="table text-xs">
                <thead>
                  <tr>
                    {preview.headers.map((header) => (
                      <th key={header} className="whitespace-nowrap">
                        {header}
                        {Object.values(mapping).includes(header) && (
                          <span className="ml-2 badge badge-info">mapped</span>
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
          <div className="flex justify-end gap-4">
            <button onClick={resetUpload} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!pharmacyName || !mapping.date || !mapping.productName || !mapping.totalPrice}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Data
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Processing Step */}
      {step === 'processing' && (
        <div className="card">
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-white mb-1">Processing Your Data</p>
              <p className="text-slate-400 text-sm">This may take a moment...</p>
            </div>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && result && (
        <div className="card">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white mb-2">Upload Complete!</p>
              <p className="text-slate-400">Your invoice data has been processed successfully</p>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-6 w-full max-w-md">
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">{result.invoices}</p>
                <p className="text-sm text-slate-400">Invoices</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">{result.items}</p>
                <p className="text-sm text-slate-400">Items</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white truncate">{result.pharmacy}</p>
                <p className="text-sm text-slate-400">Pharmacy</p>
              </div>
            </div>

            <button onClick={resetUpload} className="btn btn-primary mt-6">
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

