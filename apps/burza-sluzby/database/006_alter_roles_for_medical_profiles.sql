-- Burza Sluzby: rozsireni roloveho modelu o zdravotnicke role.
-- Spustit v databazi: burza-sluzby-dev

ALTER TABLE burza_sluzby_users
    MODIFY COLUMN local_role ENUM('employee','doctor','head_doctor','paramedic','approver','admin')
    NOT NULL DEFAULT 'employee';

ALTER TABLE burza_sluzby_catalog
    MODIFY COLUMN role_scope ENUM('employee','doctor','head_doctor','paramedic','approver','admin','*')
    NOT NULL DEFAULT '*';
