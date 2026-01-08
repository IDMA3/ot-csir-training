import { toast } from 'sonner';

interface CSVExportOptions {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export function exportToCSV({ filename, headers, rows }: CSVExportOptions) {
  const escapeValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [
    headers.map(escapeValue).join(','),
    ...rows.map(row => row.map(escapeValue).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  
  toast.success('Report exported successfully');
}
