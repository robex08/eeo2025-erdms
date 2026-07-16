-- Zachovat status jako raw zdrojovou hodnotu bez semantickeho defaultu

ALTER TABLE vehicles_cars_list_v2
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT '';
