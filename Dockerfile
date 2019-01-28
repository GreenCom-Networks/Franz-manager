FROM nginx:stable-alpine

ENV APP franz-manager
ENV BASE_NGINX /usr/share/nginx/html

COPY . /$APP/.
COPY deploy.js /

RUN apk update \
    && apk add --update nodejs npm \
    && cd /$APP \
    && npm i -g npm \
    && npm i \
    && npm rebuild node-sass --force \
    && NODE_ENV=production npm run build \
    && mkdir -p ${BASE_NGINX}/ \
    && mv -f dist ${BASE_NGINX}/$APP \
    && cp nginx.conf /etc/nginx/conf.d/default.conf \
    && chmod -R 755 ${BASE_NGINX} \
    && rm -rf /$APP

CMD NODE_ENV=production node /deploy.js && nginx -g 'daemon off;'
