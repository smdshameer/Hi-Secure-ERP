const numToWordsMap: Record<number, string> = {
  0: '', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five',
  6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten',
  11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen',
  16: 'Sixteen', 17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen', 20: 'Twenty',
  30: 'Thirty', 40: 'Forty', 50: 'Fifty', 60: 'Sixty', 70: 'Seventy',
  80: 'Eighty', 90: 'Ninety',
};

function convertLessThanThousand(num: number): string {
  let str = '';
  if (num >= 100) {
    str += numToWordsMap[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num > 0) {
    if (num <= 20) {
      str += numToWordsMap[num];
    } else {
      str += numToWordsMap[Math.floor(num / 10) * 10] + ' ';
      if (num % 10 > 0) {
        str += numToWordsMap[num % 10];
      }
    }
  }
  return str.trim();
}

export function toRupeesInWords(amountInput: number | string): string {
  const amount = Number(amountInput);
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const parts = amount.toFixed(2).split('.');
  let rupees = Number(parts[0]);
  const paise = Number(parts[1]);

  let words = '';

  // Crores (1,00,00,000)
  if (rupees >= 10000000) {
    words += convertLessThanThousand(Math.floor(rupees / 10000000)) + ' Crore ';
    rupees %= 10000000;
  }

  // Lakhs (1,00,000)
  if (rupees >= 100000) {
    words += convertLessThanThousand(Math.floor(rupees / 100000)) + ' Lakh ';
    rupees %= 100000;
  }

  // Thousands (1,000)
  if (rupees >= 1000) {
    words += convertLessThanThousand(Math.floor(rupees / 1000)) + ' Thousand ';
    rupees %= 1000;
  }

  // Hundreds & units
  if (rupees > 0) {
    words += convertLessThanThousand(rupees);
  }

  words = words.trim();
  if (words) {
    words = 'Rupees ' + words;
  }

  let paiseWords = '';
  if (paise > 0) {
    paiseWords = convertLessThanThousand(paise) + ' Paise';
    if (words) {
      words += ' and ' + paiseWords + ' Only';
    } else {
      words = paiseWords + ' Only';
    }
  } else {
    words += ' Only';
  }

  // Clean double spaces
  return words.replace(/\s+/g, ' ').trim();
}
