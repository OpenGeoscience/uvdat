FROM node:20-alpine AS builder

RUN apk add --no-cache git
WORKDIR /web
COPY web .
RUN npm install
RUN npm run build

FROM nginx:alpine

COPY demo/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /web/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-c", "/etc/nginx/nginx.conf", "-g", "daemon off;"]
