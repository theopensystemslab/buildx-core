// Standard number formatter
export const formatNumber = (number: number, locale = "en-GB") => {
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });
  return Math.abs(number) > 1000
    ? `${Math.floor(number / 1000)}k`
    : formatter.format(number);
};

// Currency formatter
export const formatCurrency = (
  number: number,
  currency: string,
  locale = "en-GB"
) => {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  });
  return formatter.format(number);
};
