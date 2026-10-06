import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { vendorReportedMethod } from "@/components/vendor-reported-note";
import type { VendorReportedProvenance } from "@/data/leaderboard";

// A vendor-reported row's model name, which is its marker (ADR 0009): a
// button underlined dotted in grey, as the column headers mark their
// tooltips, on a row in the enhancement tint, opening a popover that
// cites the source and links it, in the same tab like the masthead's sources.
// A popover rather than a tooltip, because it opens on tap as well as hover,
// and Enter moves keyboard focus into it, so the link is reachable everywhere
// (vendor-reported-data ticket 07).
export function VendorReportedName({
  displayName,
  provenance,
}: {
  displayName: string;
  provenance: VendorReportedProvenance;
}) {
  const method = vendorReportedMethod(provenance);
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={100}
        render={
          <button
            type="button"
            className="underline decoration-muted-foreground decoration-dotted underline-offset-4"
          />
        }
      >
        {displayName}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-xs gap-1.5 rounded-2xl p-3 text-xs">
        <p>Reported by the vendor, not run by DeepSWE.</p>
        <p>
          <a
            href={provenance.sourceUrl}
            className="text-brand underline underline-offset-4 hover:decoration-2"
          >
            {provenance.source}
          </a>
          , {provenance.publishedAt}.
        </p>
        {method !== undefined && <p className="text-muted-foreground">{method}</p>}
      </PopoverContent>
    </Popover>
  );
}
