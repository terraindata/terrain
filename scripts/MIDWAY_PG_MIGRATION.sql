-- versions
ALTER TABLE versions RENAME TO "versions";
ALTER TABLE "versions" RENAME COLUMN id TO "id";
ALTER TABLE "versions" RENAME COLUMN objecttype TO "objectType";
ALTER TABLE "versions" RENAME COLUMN objectid TO "objectId";
ALTER TABLE "versions" RENAME COLUMN object TO "object";
ALTER TABLE "versions" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE "versions" RENAME COLUMN createdbyuserid TO "createdByUserId";

-- items
ALTER TABLE items RENAME TO "items";
ALTER TABLE "items" RENAME COLUMN id TO "id";
ALTER TABLE "items" RENAME COLUMN meta TO "meta";
ALTER TABLE "items" RENAME COLUMN name TO "name";
ALTER TABLE "items" RENAME COLUMN parent TO "parent";
ALTER TABLE "items" RENAME COLUMN status TO "status";
ALTER TABLE "items" RENAME COLUMN type TO "type";

-- databases
ALTER TABLE databases RENAME TO "databases";
ALTER TABLE "databases" RENAME COLUMN id TO "id";
ALTER TABLE "databases" RENAME COLUMN name TO "name";
ALTER TABLE "databases" RENAME COLUMN type TO "type";
ALTER TABLE "databases" RENAME COLUMN dsn TO "dsn";
ALTER TABLE "databases" RENAME COLUMN host TO "host";
ALTER TABLE "databases" RENAME COLUMN isanalytics TO "isAnalytics";
ALTER TABLE "databases" RENAME COLUMN analyticsindex TO "analyticsIndex";
ALTER TABLE "databases" RENAME COLUMN analyticstype TO "analyticsType";

-- users
ALTER TABLE users RENAME TO "users";
ALTER TABLE "users" RENAME COLUMN id TO "id";
ALTER TABLE "users" RENAME COLUMN accesstoken TO "accessToken";
ALTER TABLE "users" RENAME COLUMN email TO "email";
ALTER TABLE "users" RENAME COLUMN isdisabled TO "isDisabled";
ALTER TABLE "users" RENAME COLUMN issuperuser TO "isSuperUser";
ALTER TABLE "users" RENAME COLUMN name TO "name";
ALTER TABLE "users" RENAME COLUMN oldpassword TO "oldPassword";
ALTER TABLE "users" RENAME COLUMN password TO "password";
ALTER TABLE "users" RENAME COLUMN timezone TO "timezone";
ALTER TABLE "users" RENAME COLUMN meta TO "meta";

-- metrics
ALTER TABLE metrics RENAME TO "metrics";
ALTER TABLE "metrics" RENAME COLUMN id TO "id";
ALTER TABLE "metrics" RENAME COLUMN database TO "database";
ALTER TABLE "metrics" RENAME COLUMN label TO "label";
ALTER TABLE "metrics" RENAME COLUMN events TO "events";

-- integrations
ALTER TABLE integrations RENAME TO "integrations";
ALTER TABLE "integrations" RENAME COLUMN id TO "id";
ALTER TABLE "integrations" RENAME COLUMN authconfig TO "authConfig";
ALTER TABLE "integrations" RENAME COLUMN connectionconfig TO "connectionConfig";
ALTER TABLE "integrations" RENAME COLUMN createdby TO "createdBy";
ALTER TABLE "integrations" RENAME COLUMN meta TO "meta";
ALTER TABLE "integrations" RENAME COLUMN name TO "name";
ALTER TABLE "integrations" RENAME COLUMN readpermission TO "readPermission";
ALTER TABLE "integrations" RENAME COLUMN type TO "type";
ALTER TABLE "integrations" RENAME COLUMN lastmodified TO "lastModified";
ALTER TABLE "integrations" RENAME COLUMN writepermission TO "writePermission";

-- schemaMetadata
ALTER TABLE schemametadata RENAME TO "schemaMetadata";
ALTER TABLE "schemaMetadata" RENAME COLUMN id TO "id";
ALTER TABLE "schemaMetadata" RENAME COLUMN columnid TO "columnId";
ALTER TABLE "schemaMetadata" RENAME COLUMN count TO "count";
ALTER TABLE "schemaMetadata" RENAME COLUMN starred TO "starred";
ALTER TABLE "schemaMetadata" RENAME COLUMN countbyalgorithm TO "countByAlgorithm";

-- resultsConfig
ALTER TABLE resultsconfig RENAME TO "resultsConfig";
ALTER TABLE "resultsConfig" RENAME COLUMN id TO "id";
ALTER TABLE "resultsConfig" RENAME COLUMN index TO "index";
ALTER TABLE "resultsConfig" RENAME COLUMN thumbnail TO "thumbnail";
ALTER TABLE "resultsConfig" RENAME COLUMN name TO "name";
ALTER TABLE "resultsConfig" RENAME COLUMN score TO "score";
ALTER TABLE "resultsConfig" RENAME COLUMN fields TO "fields";
ALTER TABLE "resultsConfig" RENAME COLUMN formats TO "formats";
ALTER TABLE "resultsConfig" RENAME COLUMN primarykeys TO "primaryKeys";

-- templates
ALTER TABLE templates RENAME TO "templates";
ALTER TABLE "templates" RENAME COLUMN id TO "id";
ALTER TABLE "templates" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE "templates" RENAME COLUMN lastmodified TO "lastModified";
ALTER TABLE "templates" RENAME COLUMN archived TO "archived";
ALTER TABLE "templates" RENAME COLUMN templatename TO "templateName";
ALTER TABLE "templates" RENAME COLUMN process TO "process";
ALTER TABLE "templates" RENAME COLUMN sources TO "sources";
ALTER TABLE "templates" RENAME COLUMN sinks TO "sinks";
ALTER TABLE "templates" RENAME COLUMN settings TO "settings";
ALTER TABLE "templates" RENAME COLUMN meta TO "meta";
ALTER TABLE "templates" RENAME COLUMN uidata TO "uiData";

-- schedules
ALTER TABLE schedules RENAME TO "schedules";
ALTER TABLE "schedules" RENAME COLUMN id TO "id";
ALTER TABLE "schedules" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE "schedules" RENAME COLUMN createdby TO "createdBy";
ALTER TABLE "schedules" RENAME COLUMN cron TO "cron";
ALTER TABLE "schedules" RENAME COLUMN lastmodified TO "lastModified";
ALTER TABLE "schedules" RENAME COLUMN lastrun TO "lastRun";
ALTER TABLE "schedules" RENAME COLUMN meta TO "meta";
ALTER TABLE "schedules" RENAME COLUMN name TO "name";
ALTER TABLE "schedules" RENAME COLUMN priority TO "priority";
ALTER TABLE "schedules" RENAME COLUMN running TO "running";
ALTER TABLE "schedules" RENAME COLUMN shouldrunnext TO "shouldRunNext";
ALTER TABLE "schedules" RENAME COLUMN tasks TO "tasks";
ALTER TABLE "schedules" RENAME COLUMN workerid TO "workerId";

-- jobLogs
ALTER TABLE joblogs RENAME TO "jobLogs";
ALTER TABLE "jobLogs" RENAME COLUMN id TO "id";
ALTER TABLE "jobLogs" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE "jobLogs" RENAME COLUMN contents TO "contents";

-- jobs
ALTER TABLE jobs RENAME TO "jobs";
ALTER TABLE "jobs" RENAME COLUMN id TO "id";
ALTER TABLE "jobs" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE "jobs" RENAME COLUMN createdby TO "createdBy";
ALTER TABLE "jobs" RENAME COLUMN endtime TO "endTime";
ALTER TABLE "jobs" RENAME COLUMN logid TO "logId";
ALTER TABLE "jobs" RENAME COLUMN meta TO "meta";
ALTER TABLE "jobs" RENAME COLUMN name TO "name";
ALTER TABLE "jobs" RENAME COLUMN pausedfilename TO "pausedFilename";
ALTER TABLE "jobs" RENAME COLUMN priority TO "priority";
ALTER TABLE "jobs" RENAME COLUMN running TO "running";
ALTER TABLE "jobs" RENAME COLUMN runnowpriority TO "runNowPriority";
ALTER TABLE "jobs" RENAME COLUMN scheduleid TO "scheduleId";
ALTER TABLE "jobs" RENAME COLUMN starttime TO "startTime";
ALTER TABLE "jobs" RENAME COLUMN status TO "status";
ALTER TABLE "jobs" RENAME COLUMN tasks TO "tasks";
ALTER TABLE "jobs" RENAME COLUMN type TO "type";
ALTER TABLE "jobs" RENAME COLUMN workerid TO "workerId";

-- statusHistory
ALTER TABLE statushistory RENAME TO "statusHistory";
ALTER TABLE "statusHistory" RENAME COLUMN id TO "id";
ALTER TABLE "statusHistory" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE "statusHistory" RENAME COLUMN userid TO "userId";
ALTER TABLE "statusHistory" RENAME COLUMN algorithmid TO "algorithmId";
ALTER TABLE "statusHistory" RENAME COLUMN fromstatus TO "fromStatus";
ALTER TABLE "statusHistory" RENAME COLUMN tostatus TO "toStatus";
