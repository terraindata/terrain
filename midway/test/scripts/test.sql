PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
INSERT INTO "versions" VALUES(1,'items',2,'{"id":2,"meta":"#realmusician","name":"Updated Item","parent":0,"status":"LIVE","type":"CATEGORY"}','2017-05-31 00:22:04',1);
INSERT INTO "items" VALUES(1,'I won a Nobel prize! But Im more proud of my music','Al Gore',0,'Still Alive','GROUP');
INSERT INTO "items" VALUES(2,'#realmusician','Updated Item',0,'LIVE','CATEGORY');
INSERT INTO "items" VALUES(3,'Are we an item?','Justin Bieber',0,'Baby','ALGORITHM');
INSERT INTO "users" VALUES(2,'','test@terraindata.com',0,0,'Test Person',NULL,'$2a$10$Bov3ZgCLKd2l/4bu0cXP2OEofcknNO1mhW9Tt.MjFzQdqRUK//NXe','UTC','{}');
COMMIT;
