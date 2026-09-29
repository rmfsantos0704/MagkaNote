/** 1234.5 -> "₱1,234.50" */
export function peso(n: number): string {
  const [whole, decimals] = n.toFixed(2).split('.');
  return `₱${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimals}`;
}

/** 0.5 -> "0.5", 2 -> "2", 0.25 -> "0.25" (no trailing zeros) */
export function qty(n: number): string {
  return Number(n.toFixed(2)).toString();
}
