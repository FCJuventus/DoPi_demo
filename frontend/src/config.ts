export const APP_FEE_PCT = 0.05;
export const APP_FEE_MIN = 0.01;

export function calcFee(budgetPi: number) {
  const pct = +(budgetPi * APP_FEE_PCT).toFixed(2);
  const fee = Math.max(pct, APP_FEE_MIN);
  const total = +(budgetPi + fee).toFixed(2);
  return { fee, total };
}
