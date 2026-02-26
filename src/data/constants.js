export const SM = {
  published:{ label:"Published",    dot:"#22C55E", bg:"#F0FDF4", tx:"#166534" },
  scheduled:{ label:"Scheduled",    dot:"#3B82F6", bg:"#EFF6FF", tx:"#1D4ED8" },
  in_wix:   { label:"In Wix Draft", dot:"#F59E0B", bg:"#FFFBEB", tx:"#92400E" },
};

// Dynamic date calculations
const now = new Date();
export const TODAY = now.getDate();

// Generate MONTH_DATA dynamically: 6 months back + current + 6 months ahead
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getStartDow(year, month) {
  return new Date(year, month, 1).getDay();
}

const monthRange = [];
let currentIdx = 0;
for (let offset = -3; offset <= 6; offset++) {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const m = d.getMonth();
  const y = d.getFullYear();
  if (offset === 0) currentIdx = monthRange.length;
  monthRange.push([MONTH_NAMES[m], y, getDaysInMonth(y, m), getStartDow(y, m)]);
}

export const MONTH_DATA = monthRange;
export const CURRENT_MONTH_IDX = currentIdx;
