-- ── Career Nodes: more roles in existing tracks + 2 new tracks ─────────────────

insert into career_nodes (title, level, avg_salary_myr_min, avg_salary_myr_max, typical_years_in_role, category, description) values
  -- Engineering (more depth)
  ('Staff Software Engineer', 'senior', 16000, 24000, 3, 'Engineering', 'Deep technical expertise across systems, drives architecture without people management'),
  ('DevOps Engineer', 'mid', 7000, 13000, 3, 'Engineering', 'Builds and maintains CI/CD, infrastructure, and deployment pipelines'),

  -- Data / AI (more depth)
  ('Analytics Engineer', 'mid', 7000, 12000, 3, 'Data', 'Builds data models and pipelines bridging data engineering and analytics'),
  ('AI Research Engineer', 'senior', 13000, 22000, 3, 'AI/ML', 'Researches and prototypes novel ML approaches for production use cases'),

  -- Product (more depth)
  ('Growth Product Manager', 'mid', 7500, 13000, 3, 'Product', 'Owns acquisition, activation, and retention experiments'),

  -- Design (more depth)
  ('Design Systems Lead', 'senior', 10000, 16000, 3, 'Design', 'Owns the design system and cross-product UI consistency'),

  -- Business (more depth)
  ('Operations Manager', 'mid', 6500, 11000, 3, 'Business', 'Manages day-to-day operations and process improvement'),
  ('Chief of Staff', 'lead', 15000, 25000, 3, 'Business', 'Supports executive leadership on strategy and cross-functional execution'),

  -- Marketing (new track)
  ('Marketing Intern', 'entry', 900, 1800, 1, 'Marketing', 'Internship supporting campaigns and content'),
  ('Marketing Executive', 'entry', 3200, 5000, 2, 'Marketing', 'Executes marketing campaigns across channels'),
  ('Marketing Manager', 'mid', 6000, 10000, 3, 'Marketing', 'Owns marketing strategy and campaign performance'),
  ('Head of Marketing', 'lead', 14000, 24000, 4, 'Marketing', 'Leads marketing organisation and brand strategy'),

  -- Sales (new track)
  ('Sales Development Representative', 'entry', 3000, 5000, 2, 'Sales', 'Prospects and qualifies leads for the sales pipeline'),
  ('Account Executive', 'mid', 6000, 11000, 3, 'Sales', 'Manages the full sales cycle and closes deals'),
  ('Senior Account Executive', 'senior', 10000, 17000, 3, 'Sales', 'Handles enterprise accounts and complex deals'),
  ('Head of Sales', 'lead', 16000, 28000, 4, 'Sales', 'Leads sales organisation and revenue strategy');

-- ── Career Edges: connect new nodes into the graph ─────────────────────────────

insert into career_edges (from_node_id, to_node_id, avg_transition_months, skill_gaps)
select fn.id, tn.id, months, gaps::text[]
from (values
  -- Engineering depth
  ('Software Engineer',                'Staff Software Engineer',              30, '{"Deep Technical Expertise","Cross-team Influence","System Design"}'),
  ('Senior Software Engineer',          'Staff Software Engineer',              24, '{"Cross-team Influence","Technical Strategy"}'),
  ('Software Engineer',                'DevOps Engineer',                      18, '{"Infrastructure","CI/CD","Cloud Platforms"}'),

  -- Data / AI depth
  ('Data Analyst',                     'Analytics Engineer',                   18, '{"Data Modeling","dbt/Pipelines","Python"}'),
  ('Machine Learning Engineer',        'AI Research Engineer',                 24, '{"Research","Publishing","Advanced ML Theory"}'),

  -- Product depth
  ('Product Manager',                  'Growth Product Manager',               18, '{"Experimentation","Growth Metrics","A/B Testing"}'),

  -- Design depth
  ('Senior UI/UX Designer',            'Design Systems Lead',                  24, '{"Systems Thinking","Component Architecture","Cross-team Governance"}'),

  -- Business depth
  ('Business Analyst',                 'Operations Manager',                   18, '{"Process Design","Vendor Management","Ops Metrics"}'),
  ('Operations Manager',               'Chief of Staff',                       24, '{"Executive Communication","Cross-functional Leadership","Strategic Planning"}'),
  ('Senior Business Analyst',          'Chief of Staff',                       24, '{"Executive Communication","Strategic Planning","Org-wide Influence"}'),

  -- Marketing track
  ('Marketing Intern',                 'Marketing Executive',                  6,  '{"Campaign Execution","Copywriting","Analytics Basics"}'),
  ('Marketing Executive',              'Marketing Manager',                    24, '{"Strategy","Budget Management","Team Leadership"}'),
  ('Marketing Manager',                'Head of Marketing',                    30, '{"Brand Strategy","Org Leadership","Executive Communication"}'),

  -- Sales track
  ('Sales Development Representative', 'Account Executive',                    18, '{"Negotiation","Deal Closing","Pipeline Management"}'),
  ('Account Executive',                'Senior Account Executive',             24, '{"Enterprise Sales","Complex Negotiation","Account Strategy"}'),
  ('Senior Account Executive',         'Head of Sales',                        30, '{"Sales Leadership","Revenue Strategy","Team Building"}'),

  -- Cross-track transitions into the new tracks
  ('Business Analyst',                 'Marketing Executive',                  12, '{"Marketing Fundamentals","Campaign Analytics","Content Basics"}'),
  ('Business Analyst',                 'Sales Development Representative',     6,  '{"Sales Fundamentals","CRM Tools","Negotiation Basics"}'),
  ('Strategy Consultant',              'Marketing Manager',                    18, '{"Brand Strategy","Campaign Management","Team Leadership"}')
) as t(from_title, to_title, months, gaps)
join career_nodes fn on fn.title = t.from_title
join career_nodes tn on tn.title = t.to_title;

-- ── Salary Benchmarks: cover the new roles ─────────────────────────────────────
-- experience_band must exactly match one of the 5 bands the Fair Pay UI offers:
-- 'Intern', '0-2 years', '2-5 years', '5-8 years', '8+ years' (components/FairPayEngine.tsx)

insert into salary_data (role, location, experience_band, p25, p50, p75) values
  ('Staff Software Engineer',              'Kuala Lumpur', '5-8 years',  15000, 19000, 24000),
  ('DevOps Engineer',                      'Kuala Lumpur', '2-5 years',  6500,  9000,  12000),
  ('Analytics Engineer',                   'Kuala Lumpur', '2-5 years',  6500,  9500,  13000),
  ('AI Research Engineer',                 'Kuala Lumpur', '5-8 years',  14000, 18500, 24000),
  ('Marketing Executive',                  'Kuala Lumpur', '0-2 years',  3000,  4200,  5500),
  ('Marketing Manager',                    'Kuala Lumpur', '2-5 years',  5500,  8500,  12000),
  ('Sales Development Representative',     'Kuala Lumpur', '0-2 years',  2800,  4000,  5500),
  ('Account Executive',                    'Kuala Lumpur', '2-5 years',  5500,  8500,  12000),
  ('Operations Manager',                   'Kuala Lumpur', '2-5 years',  6000,  8500,  11500);
