import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VendorMark } from "@/components/vendor-mark";
import { cn } from "cn";
import {
  setModels,
  toggleModel,
  type LeaderboardFilters,
  type ModelOption,
} from "@/data/leaderboard";

// The Models picker ("Models menu" in UI copy): a checkbox per model, with
// select-all and clear under a separator. The trigger counts the selection.
export function ModelsPicker({
  filters,
  onChange,
  models,
}: {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
  models: ModelOption[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        Models ({filters.models.size}/{models.length})
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="max-h-72 overflow-y-auto">
          {models.map(({ model, displayName, vendor, vendorReported }) => (
            <DropdownMenuCheckboxItem
              key={model}
              // Vendor-reported models take their rows' enhancement tint,
              // deepening on focus as a row does on hover (ADR 0009).
              className={cn(
                vendorReported &&
                  "bg-brand/5 focus:bg-brand/10 dark:bg-brand/8 dark:focus:bg-brand/15",
              )}
              checked={filters.models.has(model)}
              closeOnClick={false}
              onCheckedChange={() => onChange(toggleModel(filters, model))}
            >
              <VendorMark vendor={vendor} />
              {displayName}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => onChange(setModels(filters, new Set(models.map(({ model }) => model))))}
        >
          Select all
        </DropdownMenuItem>
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => onChange(setModels(filters, new Set()))}
        >
          Clear
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
