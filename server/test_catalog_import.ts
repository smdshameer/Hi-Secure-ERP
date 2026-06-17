import { BrandAliasService } from './src/services/BrandAliasService';
import { CategoryNormalizationService } from './src/services/CategoryNormalizationService';
import { ProductNormalizationService } from './src/services/ProductNormalizationService';
import { ProductValidationService } from './src/services/ProductValidationService';
import { prisma } from './src/index';

async function runTests() {
  console.log('=== RUNNING PHASE 2A SERVICES UNIT TESTS ===\n');

  // 1. Brand Normalization Tests
  console.log('--- 1. Testing BrandAliasService ---');
  const brandTests = [
    { input: 'hikvision', expected: 'Hikvision' },
    { input: 'hik vision', expected: 'Hikvision' },
    { input: 'HIK', expected: 'Hikvision' },
    { input: 'cp plus', expected: 'CP Plus' },
    { input: 'cpplus', expected: 'CP Plus' },
    { input: 'zkteco', expected: 'ZKTeco' },
    { input: 'essl', expected: 'eSSL' },
    { input: 'dahua tech', expected: 'Dahua Tech' } // Should capitalize
  ];

  for (const t of brandTests) {
    const output = BrandAliasService.normalize(t.input);
    console.log(`Input: "${t.input}" => Output: "${output}" | Match: ${output === t.expected ? '✅' : '❌'}`);
  }
  console.log();

  // 2. Category Normalization Tests
  console.log('--- 2. Testing CategoryNormalizationService ---');
  const catTests = [
    { input: 'ip camera', expected: 'Camera' },
    { input: 'bullet camera', expected: 'Camera' },
    { input: 'Network Video Recorder', expected: 'NVR' },
    { input: 'Fingerprint reader', expected: 'Biometric' },
    { input: 'Biometric Device', expected: 'Biometric' },
    { input: 'Gigabit Switch', expected: 'Gigabit Switch' } // capitalize
  ];

  for (const t of catTests) {
    const output = CategoryNormalizationService.normalize(t.input);
    console.log(`Input: "${t.input}" => Output: "${output}" | Match: ${output === t.expected ? '✅' : '❌'}`);
  }
  console.log();

  // 3. Product Normalization Tests
  console.log('--- 3. Testing ProductNormalizationService ---');
  const rawProduct = {
    brand: 'hikvision',
    category: 'bullet camera',
    model_number: 'ds-2cd2043g2-i',
    part_number: 'ds2cd2043g2i',
    name: '4mp WDR bullet camera',
    description: '4MP bullet camera with \u0001 WDR and IR.',
    cost_price: 'Rs. 4,500.50',
    selling_price: '5200',
    tax_rate: '18%'
  };

  const normalized = ProductNormalizationService.normalize(rawProduct);
  console.log('Normalized Product:', normalized);
  console.log();

  // 4. Product Validation Tests
  console.log('--- 4. Testing ProductValidationService Price Sanity ---');
  // Scenario A: Standard prices, average cost is 4000, average sell is 5000
  const warningsNormal = ProductValidationService.validatePriceRange(4500, 5200, 4000, 5000);
  console.log('Scenario A (Normal) Warnings:', warningsNormal);

  // Scenario B: Cost price exceeds selling price
  const warningsExceed = ProductValidationService.validatePriceRange(6000, 5200, 4000, 5000);
  console.log('Scenario B (Cost > Sell) Warnings:', warningsExceed);

  // Scenario C: Price outlier (>10x database average)
  const warningsOutlier = ProductValidationService.validatePriceRange(45000, 5200, 4000, 5000);
  console.log('Scenario C (10x Cost Outlier) Warnings:', warningsOutlier);

  // Scenario D: Price is zero or negative
  const warningsNegative = ProductValidationService.validatePriceRange(-10, 0, 4000, 5000);
  console.log('Scenario D (Negative/Zero) Warnings:', warningsNegative);
  console.log();

  // 5. Dice Coefficient Similarity Tests
  console.log('--- 5. Testing Dice Coefficient Similarity ---');
  const namePairs = [
    { n1: 'Hikvision 4MP Bullet Camera', n2: 'Hikvision 4MP WDR Bullet Camera', expectedMatch: true },
    { n1: 'CP Plus NVR 16 Channel', n2: 'CP Plus 16 Ch NVR', expectedMatch: false }, // lower similarity
    { n1: 'ZKTeco Biometric Reader K40', n2: 'zkteco biometric reader k40', expectedMatch: true }
  ];

  for (const pair of namePairs) {
    const similarity = ProductValidationService.diceCoefficient(pair.n1, pair.n2);
    console.log(`"${pair.n1}" vs "${pair.n2}" => Sim: ${(similarity * 100).toFixed(1)}% | Dice >= 75%: ${similarity >= 0.75 ? '✅ (Duplicate)' : '❌ (Not Duplicate)'}`);
  }
  console.log();

  // 6. Confidence Scoring Tests
  console.log('--- 6. Testing Confidence Scoring Weights ---');
  // Test high confidence
  const confHigh = ProductValidationService.computeConfidence(normalized, false);
  console.log('High Confidence case (Score / Level):', confHigh);

  // Test low confidence (missing model number, missing price)
  const lowProd = ProductNormalizationService.normalize({
    brand: null,
    category: null,
    model_number: null,
    name: 'Unknown Part',
    cost_price: null,
    selling_price: null
  });
  const confLow = ProductValidationService.computeConfidence(lowProd, false);
  console.log('Low Confidence case (Score / Level):', confLow);
  console.log();

  // 7. Check Database Connectivity & AI Settings Configuration
  console.log('--- 7. Testing Database Connection & AI Settings ---');
  try {
    const aiSetting = await prisma.setting.findUnique({ where: { key: 'ai' } });
    if (aiSetting) {
      console.log('Prisma Database Connection: ✅ SUCCESS');
      const val = aiSetting.value as any;
      console.log('NVIDIA NIM API Key Status:', val.nvidia_api_key ? '✅ Present' : '❌ Missing');
      console.log('NVIDIA NIM Model ID:', val.model_id || 'stepfun-ai/step-3.7-flash (Default)');
      console.log('NVIDIA NIM AI Enabled:', val.ai_enabled === true || val.ai_enabled === 'true' ? '✅ Yes' : '❌ No');
    } else {
      console.log('Prisma Database Connection: ✅ SUCCESS, but setting key "ai" is missing.');
    }
  } catch (err: any) {
    console.error('Database connection failed:', err.message);
  }

  await prisma.$disconnect();
  console.log('\n=== TESTS RUN COMPLETED ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
