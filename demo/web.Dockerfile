FROM node:20-alpine AS builder

RUN apk add --no-cache git
WORKDIR /web
COPY web .
RUN npm install
RUN npm run build

FROM nginx:alpine

COPY --from=builder /web/dist /user/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
