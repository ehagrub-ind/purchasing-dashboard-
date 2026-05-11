import { ReactNode } from 'react';

interface Column {
  label: string;
  align?: 'left' | 'right';
}

interface DataTableProps {
  columns: Column[];
  rows: ReactNode[][];
  title?: string;
}

export default function DataTable({ columns, rows, title }: DataTableProps) {
  return (
    <div className="table-card">
      {title && (
        <div className="table-header">
          <div className="table-title">{title}</div>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={col.align === 'right' ? 'num-right' : ''}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className={columns[ci]?.align === 'right' ? 'num-right' : ''}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
