# Sprint N (Dashboard v2) QA Verification Report

**Report ID:** QA-SPRINT-N-2024-12-28-1108  
**Date:** December 28, 2024 @ 11:08 AM UTC  
**Tester:** Claude (Automated QA)  
**Environment:** https://app.durganfieldguide.com  
**Release:** Sprint N (Dashboard v2) - 22 points

---

## Executive Summary

| Category | Status |
|----------|--------|
| Stories Tested | 6 of 6 |
| Tests Executed | 17 |
| Passed | 6 |
| Failed | 2 |
| Partial/Blocked | 9 |
| **Overall** | ⚠️ **NOT READY FOR DEPLOY** |

### Critical Blockers
1. **Stale badges not visible** on opportunity list items
2. 2. **Chip navigation broken** in Attention Required section
  
   3. ---
  
   4. ## Test Results by Story
  
   5. ### Story 2a-FIX: Remove broken View All link (1 pt)
  
   6. | Test | Result | Evidence |
   7. |------|--------|----------|
   8. | No "View all X items" link exists | ✅ **PASS** | Dashboard shows "Attention Required 50" with items but no "View all" link |
  
   9. **Status:** ✅ Ready to verify
  
   10. ---
  
   11. ### Story 1b: Stale Filters (5 pts)
  
   12. | Test | Result | Notes |
   13. |------|--------|-------|
   14. | 1b.1: ?stale=true filter | ⚠️ **PARTIAL** | URL filter works, returns 50 items. No visible "STALE" badge on list items |
   15. | 1b.2: ?decision_stale=true filter | ⚠️ **PARTIAL** | URL filter works, returns 50 items. No visible "DECISION_STALE" red badge |
   16. | 1b.3: ?analysis_stale=true filter | ⚠️ **PARTIAL** | URL filter works, returns 50 items. No "Needs Re-analysis" badge in list view |
   17. | 1b.4: Stale badge shows duration | ❌ **FAIL** | No "Stale X days" badge visible on any list items |
   18. | 1b.5: Dashboard stale count links | ❓ **BLOCKED** | No stale count visible on Dashboard to click |
  
   19. **Issues Found:**
   20. - Stale filter URL params work (page loads with filtered data)
       - - Visual badges (STALE, DECISION_STALE, "Stale 7 days") are NOT displayed on opportunity list items
         - - This defeats the UX purpose of the staleness feature
          
           - **Status:** ❌ Needs fixes before deploy
          
           - ---

           ### Story 2a: Attention Required List (8 pts)

           | Test | Result | Notes |
           |------|--------|-------|
           | 2a.1: Section visible | ✅ **PASS** | "Attention Required" section visible with count "50" |
           | 2a.2: Item structure | ✅ **PASS** | Each item shows: Title, Status badge, Source badge, Reason chip |
           | 2a.3: Chip navigation | ❌ **FAIL** | Clicking chip goes to detail page, NOT to filtered list |
           | 2a.4: Row navigation | ✅ **PASS** | Clicking row navigates to `/opportunities/[id]` |
           | 2a.5: List cap | ⚠️ **PARTIAL** | Shows 5 items (spec says max 10) |

           **Issues Found:**
           - Clicking "Needs Re-analysis" chip navigates to opportunity detail page instead of `?analysis_stale=true` filtered list
           - - List cap appears to be 5 instead of specified max 10
            
             - **Status:** ❌ Chip navigation needs fix
            
             - ---

             ### Story 5: Results to Footer (2 pts)

             | Test | Result | Notes |
             |------|--------|-------|
             | 5.1: Results card removed | ✅ **PASS** | No "Results" card in main Dashboard area |
             | 5.2: Footer shows counts | ✅ **PASS** | Footer shows "✓ 0 Won · ⊗ 0 Lost · ⊘ 0 Rejected" |
             | 5.3: Footer clickable | ✅ **PASS** | Clicking "Won" navigates to `/opportunities?status=won` |

             **Status:** ✅ Ready to verify

             ---

             ### Story 0: Sentry Error Tracking (3 pts)

             | Test | Result | Notes |
             |------|--------|-------|
             | 0.1: Test error captured | ⏭️ **SKIPPED** | Requires Sentry dashboard access |
             | 0.2: Request context included | ⏭️ **SKIPPED** | Requires Sentry dashboard access |

             **Status:** ⏭️ Blocked - needs Sentry access

             ---

             ### Story 1a: Schema Migration (3 pts)

             | Test | Result | Notes |
             |------|--------|-------|
             | API includes new fields | ❓ **INCONCLUSIVE** | `last_operator_review_at` and `exit_price` not visible in API response |

             **Status:** ❓ Needs backend verification

             ---

             ## Recommendations

             ### Must Fix Before Deploy

             1. **Story 1b - Stale Badges**
             2.    - Add visible STALE/DECISION_STALE badges to opportunity list items
                   -    - Badge should show duration (e.g., "Stale 7 days")
                    
                        - 2. **Story 2a.3 - Chip Navigation**
                          3.    - Clicking reason chips should navigate to filtered list view
                                -    - Example: "Needs Re-analysis" → `/opportunities?analysis_stale=true`
                                 
                                     - ### Nice to Have
                                     - - Increase Attention Required list cap from 5 to 10 items
                                       - - Verify Story 1a schema fields via database query
                                        
                                         - ---

                                         ## Test Environment Details

                                         - **Browser:** Chrome (automated via Claude)
                                         - - **URL:** https://app.durganfieldguide.com
                                           - - **Note:** dfg-app.vercel.app returned 404 DEPLOYMENT_NOT_FOUND
                                            
                                             - ---

                                             ## Sign-off

                                             - [ ] PM Review
                                             - [ ] - [ ] Dev Review
                                             - [ ] - [ ] Fixes Applied
                                             - [ ] - [ ] Re-test Passed
                                            
                                             - [ ] **Report Generated:** 2024-12-28T11:08:19Z
