const processProducts = (list, percent, isGstInclusive) => {
  const result = list.map(p => {
    const taxRate = p.tax_rate !== undefined && !isNaN(Number(p.tax_rate)) ? Number(p.tax_rate) : 18;
    let cost = Number(p.cost_price) || 0;
    let sell = Number(p.selling_price) || 0;

    if (isGstInclusive) {
      cost = cost / (1 + taxRate / 100);
      sell = sell / (1 + taxRate / 100);
    }

    if (percent > 0) {
      sell = cost + (cost * percent) / 100;
    }

    return {
      ...p,
      cost_price: Math.round(cost * 100) / 100,
      selling_price: Math.round(sell * 100) / 100,
      tax_rate: taxRate
    };
  });
  return result;
};

// Test data
const originalProducts = [
  {
    _index: 0,
    part_number: 'DS-7B04HGHI-F1',
    name: '1MP 4CH METAL',
    brand_name: 'HIKVISION',
    cost_price: 2162.29,
    selling_price: 2162.29,
    tax_rate: 18,
  }
];

console.log("UNCHECKED (isGstInclusive = false):");
const processedUnchecked = processProducts(originalProducts, 0, false);
console.log("Processed cost_price:", processedUnchecked[0].cost_price);
// PreviewTable logic:
const costExclUnchecked = processedUnchecked[0].cost_price;
const costIncUnchecked = costExclUnchecked * (1 + processedUnchecked[0].tax_rate / 100);
console.log("Table - Cost (Excl):", costExclUnchecked);
console.log("Table - Cost (Inc):", costIncUnchecked);

console.log("\nCHECKED (isGstInclusive = true):");
const processedChecked = processProducts(originalProducts, 0, true);
console.log("Processed cost_price:", processedChecked[0].cost_price);
// PreviewTable logic:
const costExclChecked = processedChecked[0].cost_price;
const costIncChecked = costExclChecked * (1 + processedChecked[0].tax_rate / 100);
console.log("Table - Cost (Excl):", costExclChecked);
console.log("Table - Cost (Inc):", costIncChecked);
