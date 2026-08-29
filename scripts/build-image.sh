#!/bin/bash

# Read name/version from package.json using only POSIX tools, so the image can
# be built on hosts where Node.js/npm is not installed (see #219). Anchored on
# the key and limited to the first match, so a dependency whose name happens to
# contain "name" or "version" cannot add a second line to the result.
read_pkg_field() {
  grep -m1 "\"$1\"[[:space:]]*:" package.json |
    sed -E "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"([^\"]+)\".*/\1/"
}

SPLIIT_APP_NAME=$(read_pkg_field name)
SPLIIT_VERSION=$(read_pkg_field version)

# we need to set dummy data for POSTGRES env vars in order for build not to fail
docker buildx build \
    -t ${SPLIIT_APP_NAME}:${SPLIIT_VERSION} \
    -t ${SPLIIT_APP_NAME}:latest \
    .

docker image prune -f
