# Stage 1: build the React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
# Use /api as base URL — nginx proxies /api/ to backend on same origin
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Stage 2: nginx serves frontend + proxies API + serves media/static
FROM nginx:alpine
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
