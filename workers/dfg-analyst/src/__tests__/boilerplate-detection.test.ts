/**
 * boilerplate-detection.test.ts
 *
 * Tests for Issue #21: Salvage/T&C Systemic Fix
 * Validates that boilerplate detection correctly identifies and removes
 * generic T&C text while preserving listing-specific title claims.
 */

import { strict as assert } from 'assert';
import {
  detectAndRemoveBoilerplate,
  extractTitleClaims,
  hasBoilerplate
} from '../boilerplate-detector';

// ========================================
// Test Case 1: Sierra T&C Block (Generic)
// ========================================
// Generic "may have salvage title" should NOT trigger high-confidence flag

const SIERRA_TC_GENERIC = `
2020 Utility Trailer - 7x14 Enclosed

Description:
Nice enclosed trailer in good condition. Minor dents on exterior.
Tires have 60% tread remaining. Lights work.

TITLE INFORMATION
Restored Salvage — Vehicle was previously salvaged but has been rebuilt
and inspected according to state requirements.

Salvage — Vehicle has had one or more incidents causing damage.

Left blank — CLEAN TITLE

Brand: The brand field on the title indicates the title status.

GENERAL TERMS
All items sold as-is, where-is. Items may have salvage titles.
Title status varies by lot. By bidding you agree to all terms.
`;

function testSierraTCGeneric() {
  console.log('\n[TEST 1] Sierra T&C Block (Generic)');

  const result = detectAndRemoveBoilerplate(SIERRA_TC_GENERIC);

  // Should remove boilerplate
  assert.ok(result.hasBoilerplate, 'Should detect boilerplate');
  assert.ok(result.salvageMentioned, 'Should flag salvage mentions');
  assert.ok(result.sectionsRemoved.length > 0, 'Should remove sections');

  // Should preserve listing description
  assert.ok(result.sanitized.includes('7x14 Enclosed'), 'Should preserve trailer type');
  assert.ok(result.sanitized.includes('Minor dents'), 'Should preserve condition details');
  assert.ok(result.sanitized.includes('Tires have 60%'), 'Should preserve tire info');

  // Should remove T&C sections
  assert.ok(!result.sanitized.includes('TITLE INFORMATION'), 'Should remove TITLE INFORMATION header');
  assert.ok(!result.sanitized.includes('Restored Salvage —'), 'Should remove salvage definition');
  assert.ok(!result.sanitized.includes('Items may have salvage'), 'Should remove generic warning');
  assert.ok(!result.sanitized.includes('GENERAL TERMS'), 'Should remove GENERAL TERMS header');

  // Extract title claims
  const claims = extractTitleClaims(result.original);
  assert.ok(claims.length > 0, 'Should find title mentions in original');

  const claimsInSanitized = extractTitleClaims(result.sanitized);
  assert.equal(claimsInSanitized.length, 0, 'Should remove all generic title mentions from sanitized');

  console.log('✅ Sierra T&C block correctly removed');
}

// ========================================
// Test Case 2: Listing-Specific Salvage
// ========================================
// Explicit "SALVAGE TITLE" in description SHOULD be preserved

const LISTING_SPECIFIC_SALVAGE = `
2018 Ford F-150 XLT

Title Status: Salvage

Description:
THIS VEHICLE HAS A SALVAGE TITLE due to front-end collision damage.
Frame has been inspected and certified. Runs and drives great.
All repairs completed by licensed body shop with receipts available.

Certificate of Destruction on file at DMV.
`;

function testListingSpecificSalvage() {
  console.log('\n[TEST 2] Listing-Specific Salvage');

  const result = detectAndRemoveBoilerplate(LISTING_SPECIFIC_SALVAGE);

  // Should NOT remove listing-specific claims
  assert.ok(result.sanitized.includes('Title Status: Salvage'), 'Should preserve Title Status field');
  assert.ok(result.sanitized.includes('THIS VEHICLE HAS A SALVAGE TITLE'), 'Should preserve explicit salvage statement');
  assert.ok(result.sanitized.includes('Certificate of Destruction'), 'Should preserve certificate mention');

  // Extract claims
  const claims = extractTitleClaims(result.sanitized);
  assert.ok(claims.length > 0, 'Should find listing-specific claims');

  const specificClaims = claims.filter(c => c.isListingSpecific);
  assert.ok(specificClaims.length > 0, 'Should identify claims as listing-specific');

  console.log('✅ Listing-specific salvage claims preserved');
}

// ========================================
// Test Case 3: Mixed Content
// ========================================
// Listing with BOTH boilerplate AND specific signals

const MIXED_CONTENT = `
2019 Enclosed Cargo Trailer 6x12

Title Status: On File

Description:
Single axle enclosed trailer. Frame is solid with no rust.
Rear doors open fully. New LED lights installed last month.

TITLE INFORMATION
Restored Salvage — Vehicle was previously salvaged but has been rebuilt.
Salvage — Vehicle has had one or more incidents causing damage.
Left blank — CLEAN TITLE

GENERAL TERMS
Items may have salvage titles. All sales final.
`;

function testMixedContent() {
  console.log('\n[TEST 3] Mixed Content (Boilerplate + Specific)');

  const result = detectAndRemoveBoilerplate(MIXED_CONTENT);

  // Should remove boilerplate sections
  assert.ok(result.hasBoilerplate, 'Should detect boilerplate');
  assert.ok(!result.sanitized.includes('TITLE INFORMATION'), 'Should remove T&C header');
  assert.ok(!result.sanitized.includes('Items may have salvage'), 'Should remove generic warning');
  assert.ok(!result.sanitized.includes('Restored Salvage —'), 'Should remove salvage definition');

  // Should preserve listing-specific field
  assert.ok(result.sanitized.includes('Title Status: On File'), 'Should preserve Title Status field');

  // Should preserve condition details
  assert.ok(result.sanitized.includes('Frame is solid'), 'Should preserve frame description');
  assert.ok(result.sanitized.includes('New LED lights'), 'Should preserve light info');

  console.log('✅ Mixed content correctly separated');
}

// ========================================
// Test Case 4: No Title Mention
// ========================================
// Absence of boilerplate doesn't imply clean title

const NO_TITLE_MENTION = `
2021 Flatbed Trailer 20ft

Description:
Heavy-duty flatbed trailer. Tandem axle. Recently serviced brakes.
Deck has minor surface rust but structurally sound. Good tires all around.
Includes ramps and tie-down points.
`;

function testNoTitleMention() {
  console.log('\n[TEST 4] No Title Mention');

  const result = detectAndRemoveBoilerplate(NO_TITLE_MENTION);

  // Should not detect boilerplate
  assert.ok(!result.hasBoilerplate, 'Should not detect boilerplate');
  assert.ok(!result.salvageMentioned, 'Should not flag salvage');
  assert.equal(result.sectionsRemoved.length, 0, 'Should not remove any sections');

  // Should preserve all content
  assert.ok(result.sanitized.includes('Heavy-duty flatbed'), 'Should preserve description');
  assert.ok(result.sanitized.includes('Tandem axle'), 'Should preserve axle info');
  assert.ok(result.sanitized.includes('Recently serviced brakes'), 'Should preserve maintenance info');

  // Extract claims
  const claims = extractTitleClaims(result.sanitized);
  assert.equal(claims.length, 0, 'Should find no title claims');

  console.log('✅ No false positives on clean listing');
}

// ========================================
// Test Case 5: Multiple T&C Sections
// ========================================
// Sierra listings with multiple boilerplate blocks

const MULTIPLE_TC_SECTIONS = `
2017 Car Hauler Trailer

Description:
Dual axle car hauler in excellent condition. Electric brakes work perfectly.

PRE-AUCTION REGISTRATION AND BIDDING
Bidders must register 24 hours in advance. Valid ID required.

TITLE INFORMATION
Salvage — Vehicle has had one or more incidents causing damage.

AUCTION DAY INFORMATION
Preview hours: 8am-10am. Bidding starts at 10am sharp.

PAYMENT METHODS
Cash, certified check, or wire transfer accepted.
`;

function testMultipleTCSections() {
  console.log('\n[TEST 5] Multiple T&C Sections');

  const result = detectAndRemoveBoilerplate(MULTIPLE_TC_SECTIONS);

  // Should detect and remove all T&C sections
  assert.ok(result.hasBoilerplate, 'Should detect boilerplate');
  assert.ok(result.sectionsRemoved.length > 0, 'Should remove sections');

  // Should remove all headers
  assert.ok(!result.sanitized.includes('PRE-AUCTION REGISTRATION'), 'Should remove pre-auction section');
  assert.ok(!result.sanitized.includes('TITLE INFORMATION'), 'Should remove title info section');
  assert.ok(!result.sanitized.includes('AUCTION DAY INFORMATION'), 'Should remove auction day section');
  assert.ok(!result.sanitized.includes('PAYMENT METHODS'), 'Should remove payment section');

  // Should preserve listing content
  assert.ok(result.sanitized.includes('Dual axle car hauler'), 'Should preserve description');
  assert.ok(result.sanitized.includes('Electric brakes work'), 'Should preserve condition info');

  console.log('✅ Multiple T&C sections removed');
}

// ========================================
// Test Case 6: Salvage with Context
// ========================================
// "Salvage title - frame damage" (with specific context) should be preserved

const SALVAGE_WITH_CONTEXT = `
2016 Dump Trailer 7x14

Description:
Salvage title - frame damage repaired and certified by welder.
Photos show repair work. Hydraulic dump system works perfectly.
New tires installed 2023.
`;

function testSalvageWithContext() {
  console.log('\n[TEST 6] Salvage with Context');

  const result = detectAndRemoveBoilerplate(SALVAGE_WITH_CONTEXT);

  // Should preserve listing-specific salvage claim with context
  assert.ok(result.sanitized.includes('Salvage title - frame damage'), 'Should preserve salvage with context');
  assert.ok(result.sanitized.includes('repaired and certified'), 'Should preserve repair details');

  // Extract claims
  const claims = extractTitleClaims(result.sanitized);
  const specificClaims = claims.filter(c => c.isListingSpecific);
  assert.ok(specificClaims.length > 0, 'Should identify as listing-specific');

  console.log('✅ Salvage with context preserved');
}

// ========================================
// Test Case 7: hasBoilerplate Quick Check
// ========================================

function testHasBoilerplateQuickCheck() {
  console.log('\n[TEST 7] hasBoilerplate Quick Check');

  assert.ok(hasBoilerplate(SIERRA_TC_GENERIC), 'Should detect Sierra T&C');
  assert.ok(hasBoilerplate(MULTIPLE_TC_SECTIONS), 'Should detect multiple sections');
  assert.ok(!hasBoilerplate(NO_TITLE_MENTION), 'Should not flag clean listing');
  assert.ok(!hasBoilerplate(LISTING_SPECIFIC_SALVAGE), 'Should not flag specific claims');

  console.log('✅ Quick check working correctly');
}

// ========================================
// Test Case 8: HTML Removal
// ========================================

const HTML_CONTENT = `
<style>
  .listing { color: blue; }
</style>

<script>
  console.log("tracking code");
</script>

2020 Utility Trailer in great shape.
`;

function testHTMLRemoval() {
  console.log('\n[TEST 8] HTML Removal');

  const result = detectAndRemoveBoilerplate(HTML_CONTENT);

  // Should remove HTML tags
  assert.ok(!result.sanitized.includes('<style>'), 'Should remove style tags');
  assert.ok(!result.sanitized.includes('<script>'), 'Should remove script tags');

  // Should preserve content
  assert.ok(result.sanitized.includes('2020 Utility Trailer'), 'Should preserve description');

  console.log('✅ HTML tags removed');
}

// ========================================
// Run All Tests
// ========================================

function runAllTests() {
  console.log('========================================');
  console.log('Boilerplate Detection Tests (Issue #21)');
  console.log('========================================');

  try {
    testSierraTCGeneric();
    testListingSpecificSalvage();
    testMixedContent();
    testNoTitleMention();
    testMultipleTCSections();
    testSalvageWithContext();
    testHasBoilerplateQuickCheck();
    testHTMLRemoval();

    console.log('\n========================================');
    console.log('✅ All tests passed!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
