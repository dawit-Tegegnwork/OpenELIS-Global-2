-- Pre-flight: AHRI research lab test sections vs notebook template linkage.
-- Usage:
--   docker exec -i openelisglobal-database psql -U clinlims -d clinlims -f - \
--     < scripts/verify-department-notebook-linkage.sql

\pset format wrapped

WITH ahri_departments(name) AS (
    VALUES
        ('Malaria and Neglected Tropical Disease (MNTD) Laboratory'),
        ('Biorepository Laboratory'),
        ('Tuberculosis Laboratory'),
        ('Bacteriology'),
        ('Bioanalytical Laboratory'),
        ('Immunology'),
        ('Pathology Laboratory'),
        ('Pharmaceuticals Laboratory'),
        ('Traditional & Modern Medicine Research Lab'),
        ('Viral Vaccine'),
        ('CTD'),
        ('Bioequivalence Laboratory'),
        ('Genomics & Bioinformatics Laboratory'),
        ('Virology Laboratory')
)
SELECT
    ad.name AS department_name,
    ts.id AS test_section_id,
    ts.is_active,
    loc.english AS localized_name,
    COUNT(DISTINCT nd.notebook_id) AS linked_notebook_templates,
    STRING_AGG(DISTINCT n.title, '; ' ORDER BY n.title) AS notebook_titles
FROM ahri_departments ad
LEFT JOIN clinlims.test_section ts ON ts.name = ad.name
LEFT JOIN clinlims.localization loc ON loc.id = ts.name_localization_id
LEFT JOIN clinlims.notebook_departments nd ON nd.test_section_id = ts.id
LEFT JOIN clinlims.notebook n ON n.id = nd.notebook_id AND n.is_template = true
GROUP BY ad.name, ts.id, ts.is_active, loc.english
ORDER BY ad.name;

\echo ''
\echo '=== Departments missing test_section row ==='
WITH ahri_departments(name) AS (
    VALUES
        ('Malaria and Neglected Tropical Disease (MNTD) Laboratory'),
        ('Biorepository Laboratory'),
        ('Tuberculosis Laboratory'),
        ('Bacteriology'),
        ('Bioanalytical Laboratory'),
        ('Immunology'),
        ('Pathology Laboratory'),
        ('Pharmaceuticals Laboratory'),
        ('Traditional & Modern Medicine Research Lab'),
        ('Viral Vaccine'),
        ('CTD'),
        ('Bioequivalence Laboratory'),
        ('Genomics & Bioinformatics Laboratory'),
        ('Virology Laboratory')
)
SELECT ad.name
FROM ahri_departments ad
LEFT JOIN clinlims.test_section ts ON ts.name = ad.name
WHERE ts.id IS NULL
ORDER BY ad.name;

\echo ''
\echo '=== Departments with no notebook_departments link ==='
WITH ahri_departments(name) AS (
    VALUES
        ('Malaria and Neglected Tropical Disease (MNTD) Laboratory'),
        ('Biorepository Laboratory'),
        ('Tuberculosis Laboratory'),
        ('Bacteriology'),
        ('Bioanalytical Laboratory'),
        ('Immunology'),
        ('Pathology Laboratory'),
        ('Pharmaceuticals Laboratory'),
        ('Traditional & Modern Medicine Research Lab'),
        ('Viral Vaccine'),
        ('CTD'),
        ('Bioequivalence Laboratory'),
        ('Genomics & Bioinformatics Laboratory'),
        ('Virology Laboratory')
)
SELECT ts.id, ts.name, loc.english
FROM ahri_departments ad
JOIN clinlims.test_section ts ON ts.name = ad.name
LEFT JOIN clinlims.localization loc ON loc.id = ts.name_localization_id
WHERE NOT EXISTS (
    SELECT 1 FROM clinlims.notebook_departments nd WHERE nd.test_section_id = ts.id
)
ORDER BY ts.name;
