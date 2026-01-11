-- Přidání nových typů vztahů pro ROLE a NOTIFIKACE do ENUM
-- Datum: 2025-12-12

ALTER TABLE 25_hierarchie_vztahy 
MODIFY COLUMN typ_vztahu ENUM(
    'user-user',
    'location-user',
    'user-location',
    'department-user',
    'user-department',
    'template-user',
    'template-location',
    'template-department',
    'template-role',
    'user-role',
    'role-user'
) NOT NULL;

-- Přidání sloupce role_id pro ukládání ID role v relacích
ALTER TABLE 25_hierarchie_vztahy 
ADD COLUMN role_id INT UNSIGNED NULL COMMENT 'ID role (pokud je v vztahu)' 
AFTER template_id;

-- Ověření
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'erdms_dev' 
  AND TABLE_NAME = '25_hierarchie_vztahy' 
  AND COLUMN_NAME = 'typ_vztahu';
