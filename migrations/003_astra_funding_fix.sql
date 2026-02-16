-- ============================================================
-- ASTRA TOKENS: FUNDING & INVESTMENT REFINEMENT
-- This migration extends the existing astra_balances/shared_projects system.
-- ============================================================

-- 1. Add 'target_budget' to shared_projects (voiced amount for development)
ALTER TABLE shared_projects ADD COLUMN IF NOT EXISTS target_budget numeric DEFAULT 0;

-- 2. Add 'is_founding_investment' or similar tracking if needed
-- For now, astra_contributed in project_members is sufficient to track each resident's share.

-- 3. Trigger to prevent over-funding? (Optional, usually projects can be over-funded)
-- But we can add a check that target_budget > 0.

-- 4. Improved Project Creation Function (if we want to create project + members in one go)
-- However, standard INSERT + Trigger or subsequent calls is more flexible.

-- 5. Helper view to see project funding status
CREATE OR REPLACE VIEW project_funding_status AS
SELECT 
    sp.id as project_id,
    sp.title,
    sp.target_budget,
    sp.total_astra as collected_astra,
    CASE 
        WHEN sp.target_budget > 0 THEN ROUND((sp.total_astra / sp.target_budget) * 100, 2)
        ELSE 0 
    END as funding_percentage,
    COUNT(pm.id) as participants_count
FROM shared_projects sp
LEFT JOIN project_members pm ON sp.id = pm.project_id
GROUP BY sp.id;

-- 6. Grant permissions
GRANT SELECT ON project_funding_status TO authenticated;
GRANT SELECT ON project_funding_status TO anon;

-- Note: 002_extended_schema already has transfer_astra() which updates total_astra and project_members records.
