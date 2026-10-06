import type { ReactNode } from "react";
import { useTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "cn";
import { leaderboardTableOptions, type ColumnMeta } from "@/components/leaderboard-columns";
import type { LeaderboardRow } from "@/data/leaderboard";

// The enhancement tint, shared by the derived columns and vendor-reported rows
// (ADR 0009). Fainter than the Subscriptions trigger's because it covers a
// large area.
const tint = "bg-brand/5 dark:bg-brand/8";

// A vendor-reported row's tint, and its hover: the tint doubled, as it would
// look stacked on itself, in place of the grey hover other rows take.
const vendorReportedRowTint = cn(tint, "hover:bg-brand/10 dark:hover:bg-brand/15");

// Classes shared by a column's header and cells, keyed by column id: the
// alignment. The derived tint is applied per cell, since a vendor-reported row
// already carries it; the tint alone sets the derived block apart. Column meta
// is static, so this is computed once.
const columnClasses = Object.fromEntries(
  leaderboardTableOptions.columns.map((column) => {
    const meta: ColumnMeta | undefined = column.meta;
    return [column.id, cn(meta?.align === "end" && "text-right")];
  }),
);

export function LeaderboardTable({ rows, empty }: { rows: LeaderboardRow[]; empty?: ReactNode }) {
  const table = useTable({ ...leaderboardTableOptions, data: rows });
  const columnCount = table.getAllColumns().length;

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="text-muted-foreground">
            {group.headers.map((header) => {
              const { meta } = header.column.columnDef;
              const classes = columnClasses[header.column.id];
              const sorted = header.column.getIsSorted();
              const label = (
                <>
                  <span
                    className={cn(
                      meta?.tooltip && "underline decoration-dotted underline-offset-4",
                    )}
                  >
                    <table.FlexRender header={header} />
                  </span>
                  {meta?.estimate && (
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground/80">
                      est
                    </span>
                  )}
                </>
              );
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    sorted === false ? undefined : sorted === "asc" ? "ascending" : "descending"
                  }
                  className={cn(classes, meta?.derived && tint, meta?.bar && "w-40")}
                >
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 font-medium",
                      sorted && "text-foreground",
                    )}
                  >
                    {meta?.tooltip ? (
                      <Tooltip>
                        <TooltipTrigger render={<span />}>{label}</TooltipTrigger>
                        <TooltipContent>{meta.tooltip}</TooltipContent>
                      </Tooltip>
                    ) : (
                      label
                    )}
                    {sorted === "asc" && <ArrowUp aria-hidden className="size-3.5" />}
                    {sorted === "desc" && <ArrowDown aria-hidden className="size-3.5" />}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={columnCount} className="py-8 text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        )}
        {table.getRowModel().rows.map((row) => {
          // A vendor-reported row is tinted whole, so its derived cells add
          // nothing on top: the tint never stacks.
          const vendorReported = row.original.provenance.kind === "vendor-reported";
          return (
            <TableRow key={row.id} className={cn(vendorReported && vendorReportedRowTint)}>
              {row.getAllCells().map((cell) => {
                const { meta } = cell.column.columnDef;
                const classes = columnClasses[cell.column.id];
                const value = cell.getValue();
                const bar = meta?.bar && typeof value === "number" ? value : undefined;
                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "py-1.5",
                      classes,
                      meta?.derived && !vendorReported && tint,
                      meta?.align === "end" && "tabular-nums",
                    )}
                  >
                    {bar === undefined ? (
                      <table.FlexRender cell={cell} />
                    ) : (
                      <span className="relative block h-5 leading-5">
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 rounded-r-sm bg-foreground/10 dark:bg-foreground/15"
                          style={{ width: `${bar * 100}%` }}
                        />
                        <span className="relative pr-1 font-medium">
                          <table.FlexRender cell={cell} />
                        </span>
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
