'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileUp, Check, AlertCircle, X, Clock, FileText, CheckCircle, XCircle, Info } from 'lucide-react';

interface UploadHistory {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  pharmacy_name: string;
  row_count: number;
  invoice_count: number;
  item_count: number;
  status: string;
  error_message: string | null;
  uploaded_at: string;
}

interface ColumnMapping {
  date?: string;  // Now optional
  productName: string;
  productCode?: string;
  quantity?: string;
  unitPrice?: string;
  totalPrice?: string;
}

interface PreviewData {
  headers: string[];
  preview: Record<string, string>[];
  detectedMapping: ColumnMapping;
  rowCount: number;
  skippedRows?: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pharmacyName, setPharmacyName] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    productName: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string; dateSource?: string } | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUploadHistory();
  }, []);

  const fetchUploadHistory = async () => {
    try {
      const res = await fetch('/api/upload-history?limit=10');
      if (res.ok) {
        const data = await res.json();
        setUploadHistory(data);
      }
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/upload/preview', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to parse file');

      const data: PreviewData = await res.json();
      setPreview(data);
      setMapping(data.detectedMapping || { productName: '' });
    } catch (error) {
      setResult({ error: 'Failed to parse file. Please check the format.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    // Only product name is required now
    if (!file || !pharmacyName || !mapping.productName) {
      setResult({ error: 'Please enter a pharmacy name and select the Product Name column' });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pharmacyName', pharmacyName);
      formData.append('mapping', JSON.stringify(mapping));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        let dateInfo = '';
        if (data.dateSource === 'filename') {
          dateInfo = ' (date extracted from filename)';
        } else if (data.dateSource === 'current') {
          dateInfo = ' (using today\'s date)';
        }
        
        setResult({
          success: true,
          message: `Successfully uploaded ${data.invoices} invoice(s) with ${data.items} items for ${data.pharmacy}${dateInfo}`,
          dateSource: data.dateSource,
        });
        setFile(null);
        setPreview(null);
        setMapping({ productName: '' });
        setPharmacyName('');
        fetchUploadHistory();
      } else {
        setResult({ error: data.error || 'Upload failed' });
      }
    } catch (error) {
      setResult({ error: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setMapping({ productName: '' });
    setResult(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if a date column was detected
  const hasDateColumn = mapping.date && mapping.date !== '';

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="page-title">Upload Invoices</h1>
        <p className="page-subtitle">Import invoice data from CSV, Excel, or PDF files</p>
      </div>

      {/* Upload Area */}
      <div className="card">
        {!file ? (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-[#7c9a82] bg-[#7c9a82]/5'
                : 'border-[#e8e4df] hover:border-[#c9b8a8]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 rounded-full bg-[#f7f5f2] flex items-center justify-center mx-auto mb-4">
              <FileUp className="w-6 h-6 text-[#7c9a82]" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-medium text-[#1a1a1a] mb-2">
              Drop your file here, or click to browse
            </p>
            <p className="text-sm text-[#404040]">
              Supports CSV, Excel (.xlsx, .xls), and PDF files
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center justify-between p-4 bg-[#f7f5f2] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#7c9a82]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#7c9a82]" />
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a]">{file.name}</p>
                  <p className="text-sm text-[#404040]">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button onClick={resetUpload} className="text-[#404040] hover:text-[#1a1a1a]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#7c9a82] border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-[#404040]">Analyzing file...</span>
              </div>
            )}

            {preview && !loading && (
              <>
                {/* Pharmacy Name */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                    Pharmacy Name <span className="text-[#c27272]">*</span>
                  </label>
                  <input
                    type="text"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="Enter pharmacy name..."
                    className="input"
                  />
                </div>

                {/* Column Mapping */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                    Column Mapping
                  </label>
                  
                  {/* Info message if no date column */}
                  {!hasDateColumn && (
                    <div className="mb-4 p-3 bg-[#d4a853]/10 border border-[#d4a853]/30 rounded-lg flex items-start gap-3">
                      <Info className="w-5 h-5 text-[#d4a853] mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-[#b08a3f]">No date column detected</p>
                        <p className="text-[#8a6a2f]">
                          The date will be extracted from the filename or use today's date.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-[#404040] mb-1">
                        Date Column {hasDateColumn ? '' : '(optional)'}
                      </label>
                      <select
                        value={mapping.date || ''}
                        onChange={(e) => setMapping({ ...mapping, date: e.target.value || undefined })}
                        className="select"
                      >
                        <option value="">None (use filename/today)</option>
                        {preview.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#404040] mb-1">
                        Product Name <span className="text-[#c27272]">*</span>
                      </label>
                      <select
                        value={mapping.productName}
                        onChange={(e) => setMapping({ ...mapping, productName: e.target.value })}
                        className="select"
                      >
                        <option value="">Select...</option>
                        {preview.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#404040] mb-1">Product Code</label>
                      <select
                        value={mapping.productCode || ''}
                        onChange={(e) => setMapping({ ...mapping, productCode: e.target.value || undefined })}
                        className="select"
                      >
                        <option value="">None</option>
                        {preview.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#404040] mb-1">Quantity</label>
                      <select
                        value={mapping.quantity || ''}
                        onChange={(e) => setMapping({ ...mapping, quantity: e.target.value || undefined })}
                        className="select"
                      >
                        <option value="">None (default: 1)</option>
                        {preview.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#404040] mb-1">Unit Price</label>
                      <select
                        value={mapping.unitPrice || ''}
                        onChange={(e) => setMapping({ ...mapping, unitPrice: e.target.value || undefined })}
                        className="select"
                      >
                        <option value="">None</option>
                        {preview.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#404040] mb-1">Total Price</label>
                      <select
                        value={mapping.totalPrice || ''}
                        onChange={(e) => setMapping({ ...mapping, totalPrice: e.target.value || undefined })}
                        className="select"
                      >
                        <option value="">None (uses quantity)</option>
                        {preview.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                    Preview ({preview.rowCount} rows)
                  </label>
                  <div className="overflow-x-auto rounded-lg border border-[#e8e4df]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[#f7f5f2]">
                        <tr>
                          {preview.headers.slice(0, 8).map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-medium text-[#404040]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-[#e8e4df]">
                            {preview.headers.slice(0, 8).map((h) => (
                              <td key={h} className="px-3 py-2 text-[#1a1a1a] truncate max-w-[150px]">
                                {row[h]}
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
                    disabled={uploading || !pharmacyName || !mapping.productName}
                    className="btn btn-primary"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Invoice
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Result Messages */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
            result.success ? 'bg-[#7c9a82]/10 text-[#5a7560]' : 'bg-[#c27272]/10 text-[#a25555]'
          }`}>
            {result.success ? (
              <Check className="w-5 h-5 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5" />
            )}
            <div>
              <p className="font-medium">{result.success ? 'Upload Successful' : 'Upload Failed'}</p>
              <p className="text-sm mt-1">{result.message || result.error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-[#404040]" />
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Recent Uploads</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Pharmacy</th>
                  <th className="text-right">Rows</th>
                  <th className="text-right">Invoices</th>
                  <th className="text-right">Items</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#404040]" />
                        <span className="font-medium truncate max-w-[200px]">{item.file_name}</span>
                      </div>
                    </td>
                    <td>{item.pharmacy_name}</td>
                    <td className="text-right tabular-nums">{item.row_count?.toLocaleString() || '-'}</td>
                    <td className="text-right tabular-nums">{item.invoice_count?.toLocaleString() || '-'}</td>
                    <td className="text-right tabular-nums">{item.item_count?.toLocaleString() || '-'}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'completed' 
                          ? 'bg-[#7c9a82]/10 text-[#5a7560]' 
                          : 'bg-[#c27272]/10 text-[#a25555]'
                      }`}>
                        {item.status === 'completed' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {item.status}
                      </span>
                    </td>
                    <td className="text-[#404040]">{formatDate(item.uploaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
