import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataTable from "../../components/admin/DataTable";

const rows = [
  { id: 1, name: "Alice", age: 30 },
  { id: 2, name: "Bob", age: 24 },
  { id: 3, name: "Carol", age: 27 },
];

const columns = [
  { key: "name", header: "Name", sortable: true },
  { key: "age", header: "Age", sortable: true },
];

describe("DataTable", () => {
  it("renders header and rows", () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("sorts ascending then descending by a sortable column", () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    fireEvent.click(screen.getByText("Age"));
    let cells = screen.getAllByRole("cell");
    expect(cells[1].textContent).toBe("24"); // Bob first
    fireEvent.click(screen.getByText("Age"));
    cells = screen.getAllByRole("cell");
    expect(cells[1].textContent).toBe("30"); // Alice first
  });

  it("renders an empty state when rows is []", () => {
    render(
      <DataTable
        rows={[]}
        columns={columns}
        rowKey={(r) => r.id}
        emptyMessage="No results"
      />
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("calls onRowClick with the row", () => {
    const clicks = [];
    render(
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => clicks.push(r)}
      />
    );
    fireEvent.click(screen.getByText("Alice"));
    expect(clicks).toEqual([rows[0]]);
  });
});
