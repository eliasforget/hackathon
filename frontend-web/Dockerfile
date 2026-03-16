# Angular build → nginx runtime
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first for caching
COPY package*.json ./
RUN npm ci || npm install

COPY . .
ARG API_URL=http://localhost:8080
ENV NG_APP_API_URL=${API_URL}

# Pass API URL into Angular environment via build flag
RUN npm run build -- --configuration production --base-href=/ --output-path=dist

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html
# Angular application output is in dist/browser with the new application builder
COPY --from=build /app/dist/browser/ ./

# Simple runtime env injection for API URL
COPY docker-entrypoint.sh /docker-entrypoint.d/10-env.sh
RUN chmod +x /docker-entrypoint.d/10-env.sh

EXPOSE 80
