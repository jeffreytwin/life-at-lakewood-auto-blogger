export const SM = {
  published:{ label:"Published",    dot:"#22C55E", bg:"#F0FDF4", tx:"#166534" },
  scheduled:{ label:"Scheduled",    dot:"#3B82F6", bg:"#EFF6FF", tx:"#1D4ED8" },
  in_wix:   { label:"In Wix Draft", dot:"#F59E0B", bg:"#FFFBEB", tx:"#92400E" },
};

export const TODAY = 24;
export const DAYS  = 28;
export const START_DOW = 0;

// Month data: [name, year, days, startDow]
export const MONTH_DATA = [
  ["January",  2026, 31, 4],
  ["February", 2026, 28, 0],
  ["March",    2026, 31, 0],
  ["April",    2026, 30, 3],
  ["May",      2026, 31, 5],
  ["June",     2026, 30, 1],
];
export const CURRENT_MONTH_IDX = 1; // February is default
