-- =====================================================================
-- Seed: default categories
-- Safe to run many times: ON CONFLICT (name) DO NOTHING skips any
-- category that already exists, so no duplicates are created.
-- Icons are Lucide icon names (for the React frontend later).
-- =====================================================================

INSERT INTO public.categories (name, icon, color) VALUES
  ('Food & Drinks',     'utensils',       '#F97316'),
  ('Transportation',    'car',            '#1A6BCC'),
  ('Shopping',          'shopping-bag',   '#EC4899'),
  ('Bills & Utilities', 'receipt',        '#EAB308'),
  ('Healthcare',        'heart-pulse',    '#EF4444'),
  ('Entertainment',     'film',           '#8B5CF6'),
  ('Family',            'users',          '#14B8A6'),
  ('Education',         'graduation-cap', '#00A8CC'),
  ('Other',             'package',        '#64748B')
ON CONFLICT (name) DO NOTHING;
