/** 1234.5 -> "₱1,234.50" */
export function peso(n: number): string {
  const [whole, decimals] = n.toFixed(2).split('.');
  return `₱${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimals}`;
}

/** 0.5 -> "0.5", 2 -> "2", 0.25 -> "0.25" (no trailing zeros) */
export function qty(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/** ISO date -> "Today", "Yesterday", "3 days ago", or a short date further back. */
export function relativeDate(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return then.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}