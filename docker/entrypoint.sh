#!/bin/sh
set -eu

# Default backend target if the user hasn't overridden it.
# On Render this must be set to the internal/private URL of the API service
# e.g. https://linked-store-api.onrender.com or http://host.docker.internal:8080
export API_PROXY_URL="${API_PROXY_URL:-http://127.0.0.1:8080}"

# Substitute only the declared env vars into the nginx config (avoids eating $variables)
TEMPLATE=/etc/nginx/conf.d/default.conf
WORKDIR=/etc/nginx/conf.d

envsubst '${API_PROXY_URL}' < "${TEMPLATE}" > "${WORKDIR}/default.tmp.conf"
mv "${WORKDIR}/default.tmp.conf" "${TEMPLATE}"

echo "[entrypoint] nginx proxy target set: API_PROXY_URL=${API_PROXY_URL}"

exec nginx -g 'daemon off;'
