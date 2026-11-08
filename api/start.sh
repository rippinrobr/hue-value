#!/bin/sh
# Starts the API on Fly.io. With backups set up (BUCKET_NAME and the AWS_* secrets that
# `fly storage create` adds), Litestream first restores the database if this volume is new,
# then streams every change to object storage while the server runs.
set -eu
mkdir -p "$(dirname "$DATABASE_PATH")"

if [ -n "${BUCKET_NAME:-}" ]; then
	litestream restore -config /etc/litestream.yml -if-db-not-exists -if-replica-exists "$DATABASE_PATH"
fi

# The catalog is reloaded from the image's data/ on every start, so a deploy updates it.
/app/server seed

if [ -n "${BUCKET_NAME:-}" ]; then
	exec litestream replicate -config /etc/litestream.yml -exec /app/server
fi
echo "No BUCKET_NAME, so the database is not being backed up." >&2
exec /app/server
