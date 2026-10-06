import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { VendorReportedProvenance } from "@/data/leaderboard";

// A vendor-reported row's model name, which is its marker (ADR 0009): a
// span with the button role, underlined dotted in grey as the column headers
// mark their tooltips, on a row in the enhancement tint. It opens a popover
// that says the vendor reported it and links the source, in the same tab
// like the masthead's sources, over its date.
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
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={100}
        // A span, not a button, so the name selects and takes the text
        // cursor like every other model name; Base UI gives it the button
        // role, focus and key handling.
        nativeButton={false}
        render={
          <span className="underline decoration-muted-foreground decoration-dotted underline-offset-4" />
        }
      >
        {displayName}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-xs gap-1.5 rounded-2xl p-3 text-xs">
        <PopoverTitle className="text-sm">Vendor reported</PopoverTitle>
        <p>
          <a
            href={provenance.sourceUrl}
            className="text-brand underline underline-offset-4 hover:decoration-2"
          >
            {provenance.source}
          </a>
        </p>
        <p className="text-muted-foreground">{provenance.publishedAt}</p>
      </PopoverContent>
    </Popover>
  );
}
