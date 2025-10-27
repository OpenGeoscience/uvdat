FROM node:20-alpine

RUN apk add --no-cache git
WORKDIR /web
RUN cd /web
COPY web .
RUN npm install
RUN npm run build
EXPOSE 8080
