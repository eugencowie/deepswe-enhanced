import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { cn } from "cn";
import { ModelsPicker } from "@/components/models-picker";
import { SubscriptionsPicker } from "@/components/subscriptions-picker";
import {
  setEffortView,
  type LeaderboardFilters,
  type LimitAdjustmentSource,
  type ModelOption,
  type PickerFamily,
} from "@/data/leaderboard";

const effortViews = [
  { view: "best", label: "Best" },
  { view: "all", label: "All effort levels" },
] as const;

export function LeaderboardToolbar({
  filters,
  onChange,
  models,
  pickerFamilies,
  limitAdjustments,
}: {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
  models: ModelOption[];
  pickerFamilies: PickerFamily[];
  limitAdjustments: LimitAdjustmentSource[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* The benchmark version is fixed; a static chip, not a dead toggle. */}
      <span className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}>v1.1</span>
      <ButtonGroup aria-label="Effort levels">
        {effortViews.map(({ view, label }) => (
          <Button
            key={view}
            size="sm"
            variant={filters.effortView === view ? "default" : "outline"}
            aria-pressed={filters.effortView === view}
            onClick={() => onChange(setEffortView(filters, view))}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
      <div className="ms-auto flex items-center gap-2">
        <SubscriptionsPicker
          filters={filters}
          onChange={onChange}
          pickerFamilies={pickerFamilies}
          limitAdjustments={limitAdjustments}
        />
        <ModelsPicker filters={filters} onChange={onChange} models={models} />
      </div>
    </div>
  );
}
