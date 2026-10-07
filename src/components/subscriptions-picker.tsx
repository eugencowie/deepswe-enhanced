import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";
import { VendorMark } from "@/components/vendor-mark";
import {
  setRoute,
  type AccessRoute,
  type LeaderboardFilters,
  type PickerFamily,
} from "@/data/leaderboard";

const familyLabels = { claude: "Claude", chatgpt: "ChatGPT" } as const;

// The rung formatters are exported for their unit tests only: the route card
// is a portal, so it renders nothing with react-dom/server and the figures
// can't be asserted on markup the way the column formatters are. The
// accepted cost is fast refresh for this file, which is what the suppressed
// rule protects.

// A tier discount (0.95 for 95% off) as a percentage: one decimal where
// needed ("−95%", "−97.5%"), minus sign U+2212. No discount reads "full
// price", like the API rung: a tier that excludes the flagship notes it so.
// oxlint-disable-next-line react/only-export-components
export function formatTierDiscount(discount: number): string {
  if (discount === 0) return "full price";
  const percent = Math.round(discount * 1000) / 10;
  return `−${percent}%`;
}

// A tier's monthly price as published: "$20/mo".
// oxlint-disable-next-line react/only-export-components
export function formatUsdPerMonth(value: number): string {
  return `$${value}/mo`;
}

// The Subscriptions picker: the brand-tinted trigger and its route card.
// Brand-tinted because subscription pricing is the feature the site adds.
export function SubscriptionsPicker({
  filters,
  onChange,
  pickerFamilies,
}: {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
  pickerFamilies: PickerFamily[];
}) {
  // The trigger surfaces only non-API picks: quiet on the default view, the
  // chosen tiers at a glance otherwise (column order, Claude first).
  const tierPicks = pickerFamilies.flatMap(({ family, vendor, tiers }) => {
    const tier = tiers.find((t) => t.id === filters.subscriptions[family]);
    return tier ? [{ family, vendor, tier }] : [];
  });

  return (
    <DropdownMenu>
      {/* The trigger reads "Subscriptions" while both families are on the
          API, and otherwise shows only the tier picks, each with its vendor
          mark. The explicit label keeps the accessible name prefixed and
          comma-separated: name-from-content pads a hidden separator with
          spaces. */}
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-brand/40 bg-brand/8 text-brand hover:bg-brand/15 hover:text-brand aria-expanded:bg-brand/15 aria-expanded:text-brand dark:bg-brand/12 dark:hover:bg-brand/20 dark:aria-expanded:bg-brand/20"
            aria-label={
              tierPicks.length === 0
                ? undefined
                : `Subscriptions: ${tierPicks.map(({ vendor, tier }) => `${vendor} ${tier.shortLabel}`).join(", ")}`
            }
          />
        }
      >
        {tierPicks.length === 0 ? (
          "Subscriptions"
        ) : (
          <span className="flex items-center gap-2">
            {tierPicks.map(({ family, vendor, tier }) => (
              <span key={family} className="flex items-center gap-1">
                <VendorMark vendor={vendor} className="[&>svg]:size-3.5" />
                {tier.shortLabel}
              </span>
            ))}
          </span>
        )}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <RouteCard filters={filters} onChange={onChange} pickerFamilies={pickerFamilies} />
    </DropdownMenu>
  );
}

// The popover's brand wash: a translucent brand layer over the popover
// colour at the trigger's pair (8% light, 12% dark), composited the same way
// as the columns' `bg-brand/5` (a colour-mix in oklch drifts pink at low
// chroma). Subscription-filter ticket 02 records the pairs tried.
const popoverWash = "bg-linear-to-b from-brand/8 to-brand/8 dark:from-brand/12 dark:to-brand/12";

// A route-card rung: the vendored radio item's layout and disabled styling,
// but hover and focus take a faint brand fill rather than the grey accent,
// and the selected state is a stronger brand fill with brand text instead of
// a check mark, which would crowd the discount figures. No className: the
// rung is styled here only.
function RouteRung(props: Omit<MenuPrimitive.RadioItem.Props, "className">) {
  return (
    <MenuPrimitive.RadioItem
      closeOnClick={false}
      className="flex cursor-default items-center gap-3 rounded-xl px-2.5 py-2 text-sm outline-hidden select-none focus:not-data-checked:bg-brand/8 data-checked:bg-brand/15 data-checked:text-brand data-disabled:pointer-events-none data-disabled:opacity-50 dark:focus:not-data-checked:bg-brand/10 dark:data-checked:bg-brand/20"
      {...props}
    />
  );
}

// The Subscriptions picker's popover: one price ladder per family, side by
// side where there is room. The daily driver's discount is the one loud
// figure on each rung; the price and the flagship's discount sit under it. No
// fill or edge inside is grey; secondary text stays muted.
function RouteCard({
  filters,
  onChange,
  pickerFamilies,
}: {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
  pickerFamilies: PickerFamily[];
}) {
  return (
    <DropdownMenuContent
      align="end"
      className={cn(
        "w-[min(30rem,var(--available-width))] p-2 ring-brand/20 dark:ring-brand/20",
        popoverWash,
      )}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {pickerFamilies.map(({ family, vendor, tiers }) => (
          <DropdownMenuRadioGroup
            key={family}
            value={filters.subscriptions[family]}
            onValueChange={(route) => onChange(setRoute(filters, family, route as AccessRoute))}
            className="flex min-w-0 flex-col"
          >
            <DropdownMenuLabel className="flex items-center gap-2 px-2.5 pt-1 pb-2 text-sm text-foreground">
              <VendorMark vendor={vendor} />
              {familyLabels[family]}
            </DropdownMenuLabel>
            <RouteRung value="api">
              <span className="flex-1">API</span>
              <span className="text-xs text-muted-foreground">full price</span>
            </RouteRung>
            {tiers.map((tier) => (
              <RouteRung key={tier.id} value={tier.id}>
                <span className="flex flex-1 flex-col leading-tight">
                  <span>{tier.shortLabel}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatUsdPerMonth(tier.priceUsdPerMonth)}
                  </span>
                </span>
                <span className="flex flex-col items-end leading-tight tabular-nums">
                  <span className="text-[15px] font-semibold">
                    {formatTierDiscount(tier.tierDiscount)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {tier.flagshipNote.label}: {formatTierDiscount(tier.flagshipNote.tierDiscount)}
                  </span>
                </span>
              </RouteRung>
            ))}
          </DropdownMenuRadioGroup>
        ))}
      </div>
      <DropdownMenuSeparator className="mt-2 bg-brand/20" />
      <p className="px-2.5 py-1.5 text-xs text-muted-foreground">
        Subscription costs are estimates: the struck-out API cost scaled by SemiAnalysis's measured
        value for that plan and model (agentic workload).
      </p>
    </DropdownMenuContent>
  );
}
