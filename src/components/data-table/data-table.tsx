import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, item: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  emptyState?: ReactNode;
}

const getNested = (obj: any, path: string) => {
  if (!path) return undefined;
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
};

const colKey = (col: Column<any>, idx: number) =>
  String((col && col.key) || col?.title || `col-${idx}`);

const rowKey = (row: any, idx: number) =>
  String(
    row?.id ?? row?.__rid ?? row?.public_code ?? row?.code ?? `row-${idx}`
  );

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  hasMore = false,
  onLoadMore,
  searchValue = "",
  onSearchChange,
  emptyState,
}: DataTableProps<T>) {
  const safeData = Array.isArray(data) ? data : [];

  const header = (
    <div className="flex items-center justify-between gap-2">
      {onSearchChange && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}
      {hasMore && (
        <Button variant="outline" onClick={onLoadMore} disabled={loading}>
          {loading ? "Carregando..." : "Carregar mais"}
        </Button>
      )}
    </div>
  );

  if (!loading && safeData.length === 0) {
    return (
      <div className="mt-6">
        {header}
        <div className="mt-10 flex items-center justify-center">
          {emptyState}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {header}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, ci) => (
                <TableHead key={colKey(col, ci)} className="whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    {col.title}
                    {col.sortable && (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {columns.map((col, j) => (
                      <TableCell key={`${colKey(col, j)}:sk-${i}`}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : safeData.map((item, ri) => {
                  const rk = rowKey(item, ri);
                  return (
                    <TableRow key={rk} className="border-t">
                      {columns.map((col, ci) => {
                        const rawKey = String(col.key ?? "");
                        const value = rawKey.includes(".")
                          ? getNested(item, rawKey)
                          : (item as any)[rawKey];
                        return (
                          <TableCell
                            key={`${colKey(col, ci)}:${rk}`}
                            className="whitespace-nowrap"
                          >
                            {col.render
                              ? col.render(value, item)
                              : String(value ?? "")}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
