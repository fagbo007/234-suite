/**
 * Import report (root CLAUDE.md §7, §16). Every MS Office import must complete
 * and log each fidelity loss here — never silently mangle or discard content.
 * Shared by every format (.docx/.xlsx/.pptx).
 */

export interface FidelityLoss {
  /** Short feature name, e.g. "Tables", "Images". */
  feature: string;
  /** Human-readable detail of what was dropped or simplified. */
  detail: string;
}

export interface ImportReport {
  losses: FidelityLoss[];
  /** True when the import was fully faithful (no losses). */
  readonly ok: boolean;
  /** Record a fidelity loss. */
  lossy(feature: string, detail: string): void;
}

export function createImportReport(): ImportReport {
  const losses: FidelityLoss[] = [];
  return {
    losses,
    get ok() {
      return losses.length === 0;
    },
    lossy(feature: string, detail: string) {
      losses.push({ feature, detail });
    },
  };
}
