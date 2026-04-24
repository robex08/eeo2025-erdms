-- Rozsireni planovani: terminove odpovedi na udalosti
-- Datum: 2026-04-25

-- 1) Pridat flag hlavniho terminu
ALTER TABLE `25_plan_udalosti_terminy`
  ADD COLUMN `je_hlavni` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Hlavni termin udalosti' AFTER `poznamka`;

-- 2) Pridat termin_id do odpovedi
ALTER TABLE `25_plan_udalosti_odpovedi`
  ADD COLUMN `termin_id` INT(11) NULL COMMENT 'ID terminu udalosti' AFTER `udalost_id`;

-- 3) Vytvorit hlavni termin pro udalosti, ktere ho nemaji
INSERT INTO `25_plan_udalosti_terminy` (udalost_id, dt_od, dt_do, poradi, poznamka, je_hlavni, dt_created)
SELECT u.id, u.dt_od, u.dt_do, 0, 'Hlavni termin', 1, NOW()
FROM `25_plan_udalosti` u
LEFT JOIN `25_plan_udalosti_terminy` t ON t.udalost_id = u.id AND t.je_hlavni = 1
WHERE t.id IS NULL;

-- 4) Doplnit termin_id u existujicich odpovedi
UPDATE `25_plan_udalosti_odpovedi` o
JOIN `25_plan_udalosti_terminy` t ON t.udalost_id = o.udalost_id AND t.je_hlavni = 1
SET o.termin_id = t.id
WHERE o.termin_id IS NULL;

-- 5) Upravit unikatni index a pridat vazbu na termin
ALTER TABLE `25_plan_udalosti_odpovedi` DROP INDEX `uq_udalost_user`;
ALTER TABLE `25_plan_udalosti_odpovedi`
  ADD UNIQUE KEY `uq_udalost_user_term` (`udalost_id`, `user_id`, `termin_id`),
  ADD KEY `idx_udalost_term` (`udalost_id`, `termin_id`);

ALTER TABLE `25_plan_udalosti_odpovedi`
  ADD CONSTRAINT `fk_udalosti_odpovedi_termin` FOREIGN KEY (`termin_id`) REFERENCES `25_plan_udalosti_terminy` (`id`) ON DELETE CASCADE;

-- 6) Nastavit termin_id jako povinne
ALTER TABLE `25_plan_udalosti_odpovedi`
  MODIFY `termin_id` INT(11) NOT NULL;
