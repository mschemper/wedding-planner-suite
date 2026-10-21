export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const signedMoney = (n: number) => (n < 0 ? "−" : n > 0 ? "+" : "") + money(Math.abs(n));
