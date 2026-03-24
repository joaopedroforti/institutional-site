FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL
ARG VITE_API_TIMEOUT_MS=30000

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_TIMEOUT_MS=$VITE_API_TIMEOUT_MS

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist ./

RUN cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
NGINX

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]