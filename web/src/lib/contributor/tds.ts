/** Indian TDS Section 194-O rates (revenue_pipeline.md §7) */
export const TDS_RATE_VERIFIED_BPS = 100; // 1% with PAN/Aadhaar
export const TDS_RATE_UNVERIFIED_BPS = 500; // 5% without

export function tdsRateBps(input: {
  panVerified?: boolean;
  aadhaarVerified?: boolean;
}): number {
  if (input.panVerified || input.aadhaarVerified) {
    return TDS_RATE_VERIFIED_BPS;
  }
  return TDS_RATE_UNVERIFIED_BPS;
}

export function applyTds(
  grossPaise: number,
  rateBps: number,
): { netPaise: number; tdsPaise: number; rateBps: number } {
  const tdsPaise = Math.round((grossPaise * rateBps) / 10_000);
  return {
    netPaise: Math.max(grossPaise - tdsPaise, 0),
    tdsPaise,
    rateBps,
  };
}
