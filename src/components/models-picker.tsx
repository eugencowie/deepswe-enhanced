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
import { Switch } from "@/components/ui/switch";
import { VendorMark } from "@/components/vendor-mark";
import { cn } from "cn";
import {
  pickerModels,
  setModels,
  setVendorReported,
  toggleModel,
  type LeaderboardFilters,
  type ModelOption,
} from "@/data/leaderboard";

// Vendor-reported models take the enhancement tint (ADR 0009) at the
// Subscriptions trigger's pair, deepening on focus as it does on hover. The
// rows' fainter pair barely reads as purple on the popover's dark grey.
const vendorReportedTint = "bg-brand/8 focus:bg-brand/15 dark:bg-brand/12 dark:focus:bg-brand/20";

// The Models picker ("Models menu" in UI copy): a checkbox per listed model,
// with select-all and clear under a separator, then the toggle listing
// vendor-reported models. The trigger counts the selection.
export function ModelsPicker({
  filters,
  onChange,
  models,
}: {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
  models: ModelOption[];
}) {
  const listed = pickerModels(filters, models);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        Models ({filters.models.size}/{listed.length})
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="max-h-72 overflow-y-auto">
          {listed.map(({ model, displayName, vendor, vendorReported }) => (
            <DropdownMenuCheckboxItem
              key={model}
              className={cn(vendorReported && vendorReportedTint)}
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
          onClick={() => onChange(setModels(filters, new Set(listed.map(({ model }) => model))))}
        >
          Select all
        </DropdownMenuItem>
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => onChange(setModels(filters, new Set()))}
        >
          Clear
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* A checkbox item drawn as a switch: the item keeps the menu's
            keyboard handling and role, and the switch, hidden from assistive
            tech and inert, stands in for the tick. No hover highlight, as
            befits a switch; keyboard focus keeps one. */}
        <DropdownMenuCheckboxItem
          className="pr-2 *:data-[slot=dropdown-menu-checkbox-item-indicator]:hidden focus:bg-transparent focus-visible:bg-accent"
          checked={filters.vendorReported}
          closeOnClick={false}
          onCheckedChange={(checked) => onChange(setVendorReported(filters, checked, models))}
        >
          Include vendor-reported
          {/* On, the switch takes the enhancement colour as the key to the
              tinted items. */}
          <Switch
            className="pointer-events-none ms-auto data-checked:border-brand data-checked:bg-brand"
            checked={filters.vendorReported}
            tabIndex={-1}
            aria-hidden
          />
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
