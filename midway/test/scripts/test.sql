BEGIN;
INSERT INTO "versions" VALUES(1,'items',2,'{"id":2,"meta":"#realmusician","name":"Updated Item","parent":0,"status":"LIVE","type":"CATEGORY"}','2017-05-31 00:22:04',1) ON CONFLICT DO NOTHING;
INSERT INTO "items" VALUES(1,'I won a Nobel prize! But Im more proud of my music','Al Gore',0,'Still Alive','GROUP') ON CONFLICT DO NOTHING;
INSERT INTO "items" VALUES(2,'#realmusician','Updated Item',0,'LIVE','CATEGORY') ON CONFLICT DO NOTHING;
INSERT INTO "items" VALUES(3,'Are we an item?','Justin Bieber',0,'Baby','ALGORITHM') ON CONFLICT DO NOTHING;
INSERT INTO "users" VALUES(2,'','test@terraindata.com',false,false,'Test Person',NULL,'$2a$10$Bov3ZgCLKd2l/4bu0cXP2OEofcknNO1mhW9Tt.MjFzQdqRUK//NXe','UTC','{}') ON CONFLICT DO NOTHING;
COMMIT;
