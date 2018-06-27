#!/bin/bash

reset-midway-db()
{
  echo "Drop the midway database.";
  dropdb --host=localhost --port=5432 --username=postgres midway;
  echo "Create the midway database.";
  createdb --host=localhost --port=5432 --username=postgres midway;
  echo "start the midway in production mode."
  NODE_ENV=production yarn run start-midway
}

restart-chrome-docker()
{
  echo "restart the chrome docker.";
  docker stop chrome; docker rm chrome;
  chrome_port=9222;
  chrome_image="yukinying/chrome-headless-browser";
  docker run -d --name chrome --shm-size=1024m -p $chrome_port:$chrome_port --cap-add=SYS_ADMIN $chrome_image;
}


if [ $# -eq 0 ]; then
  reset-midway-db;
  restart-chrome-docker;
else
  case $1 in
  midway):
    reset-midway-db;
    ;;
  chrome):
    restart-chrome-docker;
    ;;
  *)
    echo "reset_fullstack_midway.sh [midway/chrome]"
    ;;
  esac
fi

