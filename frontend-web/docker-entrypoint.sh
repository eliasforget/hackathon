#!/bin/sh
# Inject API URL into runtime config expected by the Angular app.
set -e

API_URL="${API_URL:-http://localhost:8080}"
mkdir -p /usr/share/nginx/html/assets
cat > /usr/share/nginx/html/assets/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  API_URL: "${API_URL}"
};
EOF
