-- Clean start for Category Definitions
DELETE FROM category_defs;

INSERT INTO category_defs 
(id, name, enabled, keywords_positive, keywords_negative, base_score, min_score_candidate, max_bid_limit, snapshot_policy, priority)
VALUES 
(
  'TRAILER_UTILITY',
  'Utility/Cargo Trailers',
  1,
  '["utility trailer","enclosed trailer","cargo trailer","tilt deck","flatbed trailer","dump trailer"]',
  '["rv","camper","parts only","toy hauler","semi"]',
  70, 60, 8000, 'candidate', 100
),
(
  'GENERATOR_PORTABLE',
  'Commercial Generators',
  1,
  '["generator","genset","kohler","generac","cummins","diesel generator"]',
  '["solar","power station","parts only","broken"]',
  65, 60, 5000, 'candidate', 90
),
(
  'WELDER_PRO',
  'Professional Welders',
  1,
  '["welder","miller","hobart","lincoln electric","tig","mig"]',
  '["mask","helmet","gloves","leads only"]',
  60, 60, 3500, 'candidate', 80
);