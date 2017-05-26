#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

pushd $DIR/../../../

yarn
yarn run fix
yarn run test-back-all

popd
