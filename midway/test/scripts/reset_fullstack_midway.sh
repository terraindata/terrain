#!/bin/bash
echo "Drop the midway database."
dropdb --host=localhost --port=5432 --username=postgres midway
echo "Create the midway database."
createdb --host=localhost --port=5432 --username=postgres midway;
echo "restart the chrome docker."
docker stop chrome; docker rm chrome;
chrome_port=9222
chrome_image="yukinying/chrome-headless-browser"
docker run -d --name chrome --shm-size=1024m -p $chrome_port:$chrome_port --cap-add=SYS_ADMIN $chrome_image

echo "start the midway in production mode."
NODE_ENV=production yarn run start-midway
