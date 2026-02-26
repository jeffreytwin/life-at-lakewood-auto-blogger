// Mock articles use the current month/year so they display correctly on the calendar
const now = new Date();
const M = now.getMonth();
const Y = now.getFullYear();

export const ARTICLES = [
  { id:"a1",  p:"lakewood", title:"Moving to Lakewood Ranch: Everything You Need to Know",   kw:"moving to Lakewood Ranch Florida",    day:3,  month:M, year:Y, status:"published" },
  { id:"a2",  p:"wellen",   title:"Wellen Park vs. Venice FL: Which Wins for Retirees?",      kw:"Wellen Park vs Venice FL",            day:5,  month:M, year:Y, status:"published" },
  { id:"a3",  p:"parrish",  title:"Parrish, FL vs. Bradenton: Which Should You Choose?",      kw:"Parrish FL vs Bradenton",             day:7,  month:M, year:Y, status:"published" },
  { id:"a4",  p:"lakewood", title:"Best Neighborhoods in Lakewood Ranch: A Full Breakdown",   kw:"best neighborhoods Lakewood Ranch",   day:10, month:M, year:Y, status:"published" },
  { id:"a5",  p:"wellen",   title:"Retiring in Wellen Park: The Honest Pros and Cons",        kw:"retiring in Wellen Park Florida",     day:12, month:M, year:Y, status:"published" },
  { id:"a6",  p:"parrish",  title:"A Neighborhood Guide to Parrish, Florida",                 kw:"Parrish Florida neighborhood guide",  day:14, month:M, year:Y, status:"published" },
  { id:"a7",  p:"lakewood", title:"Lakewood Ranch HOA Fees: The Complete 2026 Guide",         kw:"Lakewood Ranch HOA fees 2025",        day:17, month:M, year:Y, status:"published" },
  { id:"a8",  p:"wellen",   title:"Wellen Park Community Amenities: What Life Looks Like",    kw:"Wellen Park community amenities",    day:19, month:M, year:Y, status:"in_wix"    },
  { id:"a9",  p:"parrish",  title:"Moving to Parrish, Florida: The Honest 2026 Guide",        kw:"moving to Parrish Florida",           day:21, month:M, year:Y, status:"in_wix"    },
  { id:"a10", p:"lakewood", title:"Lakewood Ranch vs. Sarasota: Which is Right for You?",    kw:"Lakewood Ranch vs Sarasota",          day:24, month:M, year:Y, status:"scheduled" },
  { id:"a11", p:"wellen",   title:"Wellen Park Floor Plans: What Buyers Need to Know",        kw:"Wellen Park floor plans",             day:26, month:M, year:Y, status:"scheduled" },
  { id:"a12", p:"parrish",  title:"Cost of Living in Parrish, Florida: Is It Worth It?",     kw:"Parrish Florida cost of living",      day:28, month:M, year:Y, status:"scheduled" },
  { id:"a13", p:"longboat", title:"Longboat Key Real Estate: A Complete 2026 Buyer's Guide", kw:"Longboat Key real estate guide",      day:4,  month:M, year:Y, status:"published" },
  { id:"a14", p:"longboat", title:"Best Restaurants on Longboat Key: A Local's Guide",        kw:"best restaurants Longboat Key FL",    day:10, month:M, year:Y, status:"published" },
  { id:"a15", p:"longboat", title:"Longboat Key Beach Guide: Every Beach You Need to Visit",  kw:"Longboat Key beaches guide",          day:17, month:M, year:Y, status:"scheduled" },
  { id:"a16", p:"longboat", title:"Living on Longboat Key: Pros, Cons & What to Expect",      kw:"living on Longboat Key Florida",      day:22, month:M, year:Y, status:"in_wix"    },
];
