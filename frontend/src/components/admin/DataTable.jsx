import { useMemo, useState } from "react";

export default function DataTable({
  rows,
  columns,
  rowKey,
  onRowClick,
  emptyMessage = "No rows",
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === vb) return 0;
      const cmp = va > vb ? 1 : -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function clickHeader(col) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  if (rows.length === 0) {
    return (
      <div className="border border-cream-dark rounded-md px-6 py-10 text-center text-sm text-taupe-dark bg-white">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="border border-cream-dark rounded-md overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-cream">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={
                  "text-left font-medium text-charcoal px-3 py-2 border-b border-cream-dark " +
                  (col.sortable ? "cursor-pointer select-none" : "")
                }
                onClick={() => clickHeader(col)}
              >
                {col.header}
                {sortKey === col.key && (
                  <span className="ml-1 text-taupe-dark">
                    {sortDir === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={
                "border-b border-cream-dark last:border-b-0 " +
                (onRowClick ? "cursor-pointer hover:bg-cream" : "")
              }
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-taupe-dark">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
