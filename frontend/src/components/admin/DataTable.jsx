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
      const aNil = va === null || va === undefined;
      const bNil = vb === null || vb === undefined;
      if (aNil && bNil) return 0;
      if (aNil) return 1;
      if (bNil) return -1;
      let cmp;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
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
            {columns.map((col) => {
              const isActive = sortKey === col.key;
              const ariaSort = col.sortable
                ? isActive
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
                : undefined;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className="text-left font-medium text-charcoal px-3 py-2 border-b border-cream-dark"
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => clickHeader(col)}
                      className="inline-flex items-center gap-1 font-medium text-charcoal hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded-sm"
                    >
                      {col.header}
                      {isActive && (
                        <span className="text-taupe-dark">
                          {sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
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
