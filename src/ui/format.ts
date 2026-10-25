export const money = (n: number) => { const r = Math.round(n); return (r < 0 ? "−$" : "$") + Math.abs(r).toLocaleString("en-US"); };
export const signedMoney = (n: number) => (n < 0 ? "−" : n > 0 ? "+" : "") + money(Math.abs(n));
