import { useId } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { vendorReportedNote } from "@/components/vendor-reported-note";
import type { VendorReportedProvenance } from "@/data/leaderboard";

// A vendor-reported row's model name, which is its marker (ADR 0009): a link
// to the vendor's source, in the same tab like the masthead's sources, with a
// dashed underline in the enhancement colour. The note is the tooltip and,
// for readers who can't hover, the link's description, from a hidden copy
// that stays out of the cell's name and copied text.
export function VendorReportedName({
  displayName,
  provenance,
}: {
  displayName: string;
  provenance: VendorReportedProvenance;
}) {
  const noteId = useId();
  const note = vendorReportedNote(provenance);
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href={provenance.sourceUrl}
              aria-describedby={noteId}
              className="underline decoration-brand decoration-dashed underline-offset-4 hover:text-brand hover:decoration-solid"
            />
          }
        >
          {displayName}
        </TooltipTrigger>
        <TooltipContent>{note}</TooltipContent>
      </Tooltip>
      <span id={noteId} hidden>
        {note}
      </span>
    </>
  );
}
