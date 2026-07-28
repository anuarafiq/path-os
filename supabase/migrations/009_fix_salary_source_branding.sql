-- Rebrand: salary_data.source default/rows still said "Talentbank 2025"

alter table salary_data alter column source set default 'Path OS estimate';
update salary_data set source = 'Path OS estimate' where source = 'Talentbank 2025';
