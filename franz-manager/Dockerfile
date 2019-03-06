FROM node:10-alpine as builder

WORKDIR /franz-manager

COPY package*.json ./
RUN npm i --prod --no-optional

COPY . .
RUN npm run build


FROM nginx:stable-alpine

ENV APP franz-manager
ENV BASE_NGINX /usr/share/nginx/html

COPY --from=builder /$APP/dist/ ${BASE_NGINX}/${APP}/
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD sed -i "s~%SERVER_URL%~${SERVER_URL:-}~g; s~%WEBSOCKET_SERVER_URL%~${WEBSOCKET_SERVER_URL:-}~g" ${BASE_NGINX}/${APP}/app.js && nginx -g 'daemon off;'
