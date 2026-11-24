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

/**
 * Keeps paired side-by-side summary metrics (`Entradas` and `Saídas`) visually matched
 * and prevents collision inside a 2-column mobile grid at 375px.
 */
export function getSummaryPairAmountClass(
  firstFormattedValue: string,
  secondFormattedValue: string,
): { amountClass: string; stackColumns: boolean } {
  const maxLength = Math.max(
    firstFormattedValue.length,
    secondFormattedValue.length,
  );

  if (maxLength <= 16) {
    return {
      amountClass: "text-sm whitespace-nowrap",
      stackColumns: false,
    };
  }

  if (maxLength <= 20) {
    return {
      amountClass: "text-xs sm:text-sm whitespace-nowrap",
      stackColumns: false,
    };
  }

  return {
    amountClass: "text-sm break-words",
    stackColumns: true,
  };
}
