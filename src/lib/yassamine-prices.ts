/** Ministry decision 03/03/2025, committee 27/02/2025: first tranche, A1/A2/A3 only. */
export const YASSAMINE_APPROVED_PRICES: Record<string, number> = {};
function floor(block: number, level: number, prices: number[]) {
  prices.forEach((price, index) => { YASSAMINE_APPROVED_PRICES[`A${block}${level}${index + 1}`] = price; });
}
floor(1, 0, [178500, 137900, 143700, 168400]);
for (let level = 1; level <= 4; level++) floor(1, level, [178500, 146200, 142200, 137600, 168400]);
floor(2, 0, [170200, 168800, 138000, 168300]);
for (let level = 1; level <= 4; level++) floor(2, level, [170200, 168800, 173000, 173600]);
floor(3, 0, [139400, 139000, 136000, 134000, 168500]);
for (let level = 1; level <= 3; level++) floor(3, level, [174600, 141000, 136000, 134000, 168500]);
floor(3, 4, [174600, 141000, 133000, 134000, 168500]);
