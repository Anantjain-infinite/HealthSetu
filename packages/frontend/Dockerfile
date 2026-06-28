# ─────────────────────────────────────────────────────────────────
# Stage 1: Build the React + Vite app
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build-time env vars for Vite (VITE_ prefix required)
ARG VITE_API_URL=/api/v1
ARG VITE_SOCKET_URL=/

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the static files into /app/dist
RUN npm run build

# ─────────────────────────────────────────────────────────────────
# Stage 2: Serve built files with Nginx
# The nginx container in docker-compose will handle HTTPS termination,
# but this image provides the static files to copy into a shared volume
# (alternatively, the Nginx container can copy from this image directly).
#
# We use a lightweight nginx here so the frontend container can serve
# files on its own if needed; the main proxy nginx.conf still proxies to
# the backend.
# ─────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy the built Vite output
COPY --from=builder /app/dist /usr/share/nginx/html

# Simple nginx config for serving the SPA (React Router needs this)
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  # For React Router — always serve index.html for unknown routes\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
  # Cache static assets aggressively\n\
  location /assets/ {\n\
    expires 1y;\n\
    add_header Cache-Control "public, immutable";\n\
  }\n\
}\n' > /etc/nginx/conf.d/app.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
