-- infra/sql/proposal_rollback.sql  (rollback migration — reverse dependency order)
DROP TABLE IF EXISTS proposal_source_link;
DROP TABLE IF EXISTS proposal_draft_version;
DROP TABLE IF EXISTS proposal_team_selection;
DROP TABLE IF EXISTS proposal_section;
DROP TABLE IF EXISTS proposal_project;
