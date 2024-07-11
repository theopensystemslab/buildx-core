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

// Helpers

// export const format = (d: number) => {
//   const formatted =
//     Math.abs(d) > 1000
//       ? `${Math.floor(d / 1000)}k`
//       : d.toLocaleString("en-GB", {
//           maximumFractionDigits: 1,
//         });
//   return formatted;
// };

// export const formatLong = (d: number) => {
//   return d.toLocaleString("en-GB", {
//     maximumFractionDigits: 1,
//   });
// };

// export const formatWithUnit = (d: number, unitOfMeasurement: string) => {
//   const formatted = format(d);
//   const formattedWithUnit = ["€", "£", "$"].includes(unitOfMeasurement)
//     ? `${unitOfMeasurement}${formatted}`
//     : `${formatted}${unitOfMeasurement}`;
//   return formattedWithUnit;
// };

// export const formatWithUnitLong = (d: number, unitOfMeasurement: string) => {
//   const formatted = d.toLocaleString("en-GB", {
//     maximumFractionDigits: Math.abs(d) > 100 ? 0 : 1,
//   });
//   const formattedWithUnit =
//     unitOfMeasurement === "€"
//       ? `${unitOfMeasurement}${formatted}`
//       : `${formatted}${unitOfMeasurement}`;
//   return formattedWithUnit;
// };
