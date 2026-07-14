# --- Build stage: compile the Angular app to static assets ---
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: serve the static bundle with nginx ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/gandhi-web-ui/browser /usr/share/nginx/html
EXPOSE 80
