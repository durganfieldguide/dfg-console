/**
 * boilerplate-detector.ts
 *
 * Detects and removes Terms & Conditions boilerplate from auction listings.
 * Addresses Issue #21: Prevents analyst from misinterpreting site-wide T&C
 * (e.g., "items may have salvage titles") as listing-specific claims.
 */

export interface BoilerplateSection {
  pattern: string // What pattern matched
  text: string // The actual text removed
  startIndex: number // Where it was in the original
  endIndex: number
  category: 'tc_header' | 'disclaimer' | 'legal' | 'generic_warning' | 'html'
}

export interface SanitizationResult {
  sanitized: string // Cleaned description
  original: string // Original for reference
  sectionsRemoved: BoilerplateSection[]
  hasBoilerplate: boolean // Quick check
  salvageMentioned: boolean // Did we remove salvage-related boilerplate?
}

/**
 * Comprehensive boilerplate detection patterns.
 * These match site-wide T&C sections that should NOT be interpreted as
 * listing-specific information.
 */
const BOILERPLATE_PATTERNS = [
  // ========================================
  // T&C SECTION HEADERS
  // ========================================
  {
    pattern:
      /PRE-AUCTION REGISTRATION AND BIDDING[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Sierra pre-auction registration block',
  },
  {
    pattern: /BIDDER DECLARATION[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Sierra bidder declaration',
  },
  {
    pattern: /TERMS AND CONDITIONS[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Generic T&C section',
  },
  {
    pattern: /TITLE INFORMATION[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Sierra title information boilerplate',
  },
  {
    pattern: /GENERAL TERMS[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'General terms section',
  },
  {
    pattern: /PAYMENT METHODS[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Payment methods section',
  },
  {
    pattern: /AUCTION DAY INFORMATION[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Auction day info section',
  },
  {
    pattern:
      /DEFINITION OF TYPES OF AUCTIONS[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Auction types definition',
  },
  {
    pattern: /AUCTION PREVIEW[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Auction preview section',
  },
  {
    pattern: /BUYER'S PREMIUM[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Buyers premium section',
  },
  {
    pattern: /REMOVAL INFORMATION[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'tc_header' as const,
    description: 'Item removal section',
  },

  // ========================================
  // DISCLAIMER SECTIONS
  // ========================================
  {
    pattern: /\*\*DISCLAIMER\*\*[\s\S]*?(?=(?:Features:|Description:|Lot Details|$))/gi,
    category: 'disclaimer' as const,
    description: 'Disclaimer block',
  },
  {
    pattern: /ALL ITEMS SOLD[\s\S]*?AS-IS[\s\S]*?WHERE-IS[\s\S]*?(?=\.|$)/gi,
    category: 'disclaimer' as const,
    description: 'As-is where-is disclaimer',
  },
  {
    pattern: /Buyer agrees to[\s\S]{0,200}?(?=\.|$)/gi,
    category: 'disclaimer' as const,
    description: 'Buyer agreement clauses',
  },

  // ========================================
  // GENERIC SALVAGE/TITLE WARNINGS
  // ========================================
  {
    pattern: /Restored Salvage\s*[-–—]\s*Vehicle was previously salvaged[\s\S]*?(?=\.|$)/gi,
    category: 'generic_warning' as const,
    description: 'Restored salvage definition (educational)',
  },
  {
    pattern: /Salvage\s*[-–—]\s*Vehicle has had one or more incidents[\s\S]*?(?=\.|$)/gi,
    category: 'generic_warning' as const,
    description: 'Salvage definition (educational)',
  },
  {
    pattern: /Items may have salvage titles[\s\S]*?(?=\.|$)/gi,
    category: 'generic_warning' as const,
    description: 'Generic "may have salvage" warning',
  },
  {
    pattern: /Some items may be sold with salvage[\s\S]*?(?=\.|$)/gi,
    category: 'generic_warning' as const,
    description: 'Generic salvage possibility',
  },
  {
    pattern: /Title status varies by lot[\s\S]*?(?=\.|$)/gi,
    category: 'generic_warning' as const,
    description: 'Generic title status disclaimer',
  },
  {
    pattern: /Left blank\s*[-–—]\s*CLEAN TITLE[\s\S]*?(?=Restored Salvage|Salvage|$)/gi,
    category: 'generic_warning' as const,
    description: 'Sierra title brand legend',
  },
  {
    pattern: /Brand:[\s\S]*?(?=Odometer:|Title|$)/gi,
    category: 'generic_warning' as const,
    description: 'Brand field explanation',
  },
  {
    pattern: /All vehicles sold as-is[\s\S]*?(?=\.|$)/gi,
    category: 'generic_warning' as const,
    description: 'Generic as-is vehicle disclaimer',
  },
  {
    pattern: /Titles may contain brands[\s\S]*?(?=\.|$)/gi,
    category: 'generic_warning' as const,
    description: 'Generic title brand warning',
  },

  // ========================================
  // LEGAL / REGULATORY TEXT
  // ========================================
  {
    pattern: /By bidding you agree[\s\S]*?(?=\.|$)/gi,
    category: 'legal' as const,
    description: 'Bidding agreement clause',
  },
  {
    pattern: /All sales are final[\s\S]*?(?=\.|$)/gi,
    category: 'legal' as const,
    description: 'Final sale clause',
  },
  {
    pattern: /No warranties expressed or implied[\s\S]*?(?=\.|$)/gi,
    category: 'legal' as const,
    description: 'Warranty disclaimer',
  },

  // ========================================
  // HTML / SCRIPT TAGS
  // ========================================
  {
    pattern: /<style[\s\S]*?<\/style>/gi,
    category: 'html' as const,
    description: 'HTML style tags',
  },
  {
    pattern: /<script[\s\S]*?<\/script>/gi,
    category: 'html' as const,
    description: 'HTML script tags',
  },
  {
    pattern: /<iframe[\s\S]*?<\/iframe>/gi,
    category: 'html' as const,
    description: 'HTML iframe tags',
  },
]

/**
 * Detects if a text contains listing-specific title status claims.
 * These patterns indicate EXPLICIT per-lot declarations that should NOT be filtered.
 *
 * Examples of listing-specific claims:
 * - "Title Status: Salvage"
 * - "THIS VEHICLE HAS A SALVAGE TITLE"
 * - "Certificate of Destruction on file"
 * - "Salvage title - frame damage"
 */
const LISTING_SPECIFIC_TITLE_PATTERNS = [
  /Title Status:\s*(Salvage|Rebuilt|Clean|On File|Missing)/i,
  /THIS\s+(vehicle|item|unit|trailer)\s+has\s+a\s+(salvage|rebuilt|clean)\s+title/i,
  /Certificate of Destruction/i,
  /(Salvage|Rebuilt)\s+title\s*[-–—]\s*[^.]{10,50}/i, // "Salvage title - frame damage" (with context)
  /Title\s+is\s+(salvage|rebuilt|clean|missing)/i,
  /Sold\s+with\s+(salvage|rebuilt|clean)\s+title/i,
]

/**
 * Check if text contains listing-specific (non-boilerplate) title claims.
 */
function hasListingSpecificTitleClaim(text: string): boolean {
  return LISTING_SPECIFIC_TITLE_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * Main sanitization function.
 * Removes T&C boilerplate while preserving listing-specific content.
 */
export function detectAndRemoveBoilerplate(description: string | undefined): SanitizationResult {
  if (!description) {
    return {
      sanitized: '',
      original: '',
      sectionsRemoved: [],
      hasBoilerplate: false,
      salvageMentioned: false,
    }
  }

  const original = description
  let sanitized = description
  const sectionsRemoved: BoilerplateSection[] = []
  let salvageMentioned = false

  // Apply each boilerplate pattern
  for (const { pattern, category, description: desc } of BOILERPLATE_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = pattern.exec(sanitized)) !== null) {
      const matchedText = match[0]
      const startIndex = match.index
      const endIndex = startIndex + matchedText.length

      // Check if this section mentions salvage
      if (/salvage|rebuilt|title/i.test(matchedText)) {
        // Only flag if it's NOT a listing-specific claim
        if (!hasListingSpecificTitleClaim(matchedText)) {
          salvageMentioned = true
        }
      }

      sectionsRemoved.push({
        pattern: desc,
        text: matchedText,
        startIndex,
        endIndex,
        category,
      })

      // Remove the matched section
      sanitized = sanitized.substring(0, startIndex) + ' ' + sanitized.substring(endIndex)

      // Reset lastIndex after modification
      pattern.lastIndex = 0
      break // Process one match at a time to avoid index issues
    }
  }

  // Clean up excessive whitespace
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*\.\s*/g, '. ')
    .trim()

  return {
    sanitized,
    original,
    sectionsRemoved,
    hasBoilerplate: sectionsRemoved.length > 0,
    salvageMentioned,
  }
}

/**
 * Quick check: does description have T&C boilerplate?
 */
export function hasBoilerplate(description: string | undefined): boolean {
  if (!description) return false

  // Check for common T&C section headers
  const quickPatterns = [
    /TERMS AND CONDITIONS/i,
    /TITLE INFORMATION/i,
    /BIDDER DECLARATION/i,
    /AUCTION DAY INFORMATION/i,
    /Items may have salvage/i,
    /All items sold as-is/i,
  ]

  return quickPatterns.some((pattern) => pattern.test(description))
}

/**
 * Extract title status claims from text (for audit trail).
 * Returns the specific phrases that mention title status.
 */
export function extractTitleClaims(
  text: string
): Array<{ text: string; isListingSpecific: boolean }> {
  const claims: Array<{ text: string; isListingSpecific: boolean }> = []

  // Look for any mention of salvage/rebuilt/title
  const titleMentions = text.match(/[^.]*?(salvage|rebuilt|title|clean title)[^.]*\./gi) || []

  for (const mention of titleMentions) {
    claims.push({
      text: mention.trim(),
      isListingSpecific: hasListingSpecificTitleClaim(mention),
    })
  }

  return claims
}
