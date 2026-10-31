// 골드를 만 · 억 · 조 · 경 단위로 줄여 보여 준다 (GDD 7장). BigInt 로만 계산한다.
const UNITS: [bigint, string][] = [
  [10n ** 16n, "경"],
  [10n ** 12n, "조"],
  [10n ** 8n, "억"],
  [10n ** 4n, "만"],
];

export function formatGold(n: bigint): string {
  if (n < 10000n) return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const [unit, label] = UNITS.find(([u]) => n >= u)!;
  const whole = n / unit;
  const frac = ((n % unit) * 100n) / unit;
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${wholeText}${frac > 0n ? "." + frac.toString().padStart(2, "0").replace(/0$/, "") : ""}${label}`;
}

/** 0.01% 단위 정수를 "17.9%" 처럼 보여 준다 */
export function formatBp(bp: number): string {
  return (bp / 100).toFixed(2).replace(/\.?0+$/, "") + "%";
}
