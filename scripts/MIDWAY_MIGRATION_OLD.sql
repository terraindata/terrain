-- 1.
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS importTemplatesCopy
    (id integer PRIMARY KEY,
     name text NOT NULL,
     dbid integer NOT NULL,
     dbname text NOT NULL,
     export bool,
     tablename text NOT NULL,
     originalNames text NOT NULL,
     columnTypes text NOT NULL,
     persistentAccessToken text NOT NULL,
     primaryKeyDelimiter text,
     primaryKeys text NOT NULL,
     transformations text NOT NULL);
INSERT INTO importTemplatesCopy (id, name, dbid, dbname, export, tablename, originalNames, columnTypes, persistentAccessToken, primaryKeyDelimiter, primaryKeys, transformations) SELECT importTemplates.id, importTemplates.name, importTemplates.dbid, importTemplates.dbname, importTemplates.export, importTemplates.tablename, importTemplates.originalNames, importTemplates.columnTypes, '', importTemplates.primaryKeyDelimiter, importTemplates.primaryKeys, importTemplates.transformations FROM importTemplates;
DROP TABLE importTemplates;
ALTER TABLE importTemplatesCopy RENAME TO importTemplates;
END TRANSACTION;
----------------------------------------------------------
-- 2.
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS schedules
    (id integer PRIMARY KEY,
     active bool NOT NULL,
     archived bool NOT NULL,
     currentlyRunning bool NOT NULL,
     jobId integer NOT NULL,
     jobType text NOT NULL,
     paramsScheduleStr text,
     schedule text NOT NULL,
     sort text NOT NULL,
     transportStr text);
END TRANSACTION;
----------------------------------------------------------
-- 3.
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS schedulesCopy
    (id integer PRIMARY KEY,
     active bool NOT NULL,
     archived bool NOT NULL,
     currentlyRunning bool NOT NULL,
     name text NOT NULL,
     jobId integer NOT NULL,
     jobType text NOT NULL,
     paramsScheduleStr text,
     schedule text NOT NULL,
     sort text NOT NULL,
     transportStr text);
INSERT INTO schedulesCopy (id, active, archived, currentlyRunning, name, jobId, jobType, paramsScheduleStr, schedule, sort, transportStr) SELECT schedules.id, schedules.active, schedules.archived, schedules.currentlyRunning, '', schedules.jobId, schedules.jobType, schedules.paramsScheduleStr, schedules.schedule, schedules.sort, schedules.transportStr FROM schedules;
DROP TABLE schedules;
ALTER TABLE schedulesCopy RENAME TO schedules;
END TRANSACTION;
----------------------------------------------------------
-- 4.
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS exportTemplates
     (id integer PRIMARY KEY,
     name text,
     dbid integer NOT NULL,
     dbname text NOT NULL,
     tablename text NOT NULL,
     objectKey string NOT NULL,
     originalNames text NOT NULL,
     columnTypes text NOT NULL,
     persistentAccessToken text NOT NULL,
     primaryKeyDelimiter text,
     primaryKeys text NOT NULL,
     rank bool NOT NULL,
     transformations text NOT NULL);

CREATE TABLE IF NOT EXISTS importTemplatesCopy
    (id integer PRIMARY KEY,
     name text,
     dbid integer NOT NULL,
     dbname text NOT NULL,
     tablename text NOT NULL,
     originalNames text NOT NULL,
     columnTypes text NOT NULL,
     persistentAccessToken text NOT NULL,
     primaryKeyDelimiter text,
     primaryKeys text NOT NULL,
     transformations text NOT NULL);

INSERT INTO exportTemplates (id, name, dbid, dbname, tablename, objectKey, originalNames, columnTypes, persistentAccessToken, primaryKeyDelimiter, primaryKeys, rank, transformations) SELECT importTemplates.id, importTemplates.name, importTemplates.dbid, importTemplates.dbname, importTemplates.tablename, '', importTemplates.originalNames, importTemplates.columnTypes, importTemplates.persistentAccessToken, importTemplates.primaryKeyDelimiter, importTemplates.primaryKeys, 0, importTemplates.transformations FROM importTemplates where importTemplates.export = 1;

INSERT INTO importTemplatesCopy (id, name, dbid, dbname, tablename, originalNames, columnTypes, persistentAccessToken, primaryKeyDelimiter, primaryKeys, transformations) SELECT importTemplates.id, importTemplates.name, importTemplates.dbid, importTemplates.dbname, importTemplates.tablename, importTemplates.originalNames, importTemplates.columnTypes, importTemplates.persistentAccessToken, importTemplates.primaryKeyDelimiter, importTemplates.primaryKeys, importTemplates.transformations FROM importTemplates where importTemplates.export = 0;
DROP TABLE importTemplates;
ALTER TABLE importTemplatesCopy RENAME TO importTemplates;
END TRANSACTION;
----------------------------------------------------------
-- 5.

BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS databasesCopy
    (id integer PRIMARY KEY,
     name text NOT NULL,
     type text NOT NULL,
     dsn text NOT NULL,
     host text NOT NULL,
     status text,
     isAnalytics bool DEFAULT 0,
     analyticsIndex text,
     analyticsType text);
INSERT INTO databasesCopy (id, name, type, dsn, host, status, isAnalytics) SELECT databases.id, databases.name, databases.type, databases.dsn, databases.host, databases.status, 0 FROM databases;
DROP TABLE databases;
ALTER TABLE databasesCopy RENAME TO databases;
END TRANSACTION;
----------------------------------------------------------

