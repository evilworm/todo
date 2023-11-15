#!/bin/bash

# fail fast
set -euo pipefail

TARGET="$(pwd)/$1"

if [[ -d "${TARGET}" ]]
then
    echo "CONF DIR: ${TARGET}"

    VAR_NAMES=($(grep -e "{{\ [a-zA-Z_\]*\ }}" "${TARGET}/" -r -ho | sort | uniq | grep "[a-zA-Z\_]*" -o))
    CONF_FILES=( $(find ${TARGET} -type f) )
elif [[ -f "${TARGET}" ]]
then
    echo "CONF FILE: ${TARGET}"

    VAR_NAMES=( $(grep -e "{{\ [a-zA-Z_\]*\ }}" ${TARGET} -ho | sort | uniq | grep "[a-zA-Z_]*" -o) )
    CONF_FILES=( ${TARGET} )
else
    echo "ERROR: Invalid target: '${TARGET}'"
    exit 1
fi

for NAME in "${VAR_NAMES[@]}"
do
    VALUE=$(printenv ${NAME}; exit 0)

    if [[ -z "${VALUE}" ]]
    then
        echo "ERROR: ${NAME} variable is missing"
        exit 1
    else
        echo "${NAME}=${VALUE}"
    fi

    for FILE in ${CONF_FILES[@]}
    do
        sed -i -e "s|{{ ${NAME} }}|${VALUE}|g" ${FILE}
    done
done

echo "done"
