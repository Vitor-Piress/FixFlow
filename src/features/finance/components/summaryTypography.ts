/**
 * Steps down the dark summary card hero amount size as formatted BRL strings grow,
 * preventing horizontal overflow or mid-token wrapping on 375px viewports.
 */
export function getSummaryHeroAmountClass(formattedValue: string): string {
  const length = formattedValue.length;

  if (length <= 14) {
    return "text-3xl whitespace-nowrap";
  }

  if (length <= 18) {
    return "text-2xl sm:text-3xl whitespace-nowrap";
  }

  if (length <= 22) {
    return "text-xl sm:text-2xl whitespace-nowrap";
  }

  return "text-lg sm:text-xl break-words";
}
