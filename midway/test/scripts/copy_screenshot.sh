#!/bin/bash

if [ -d "./rr/test/login/__image_snapshots__/__diff_output__/" ]; then
    now=`date +%s`
    tfile="/tmp/${now}";
    echo "copying the login snapshots into ${tfile}"
    if [ -d "${tfile}" ]; then
	cp -r ./rr/test/login/__image_snapshots__ ${tfile}/login_snapshots;
    else
	mkdir ${tfile};
	cp -r ./rr/test/login/__image_snapshots__ ${tfile}/login_snapshots;
    fi;
fi

if [ -d "./rr/test/builder/__image_snapshots__/__diff_output__/" ]; then
    now=`date +%s`
    tfile="/tmp/${now}";
    echo "copying the builder snapshots into ${tfile}"
    if [ -d "${tfile}" ]; then
	cp -r ./rr/test/builder/__image_snapshots__ ${tfile}/builder_snapshots;
    else
	mkdir ${tfile};
	cp -r ./rr/test/builder/__image_snapshots__ ${tfile}/builder_snapshots;
    fi;
fi

