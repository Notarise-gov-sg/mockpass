FROM node:18-alpine

RUN apk upgrade --update-cache --available && \
    apk add openssl && \
    rm -rf /var/cache/apk/*

# RUN apt update && apt install openssl

# RUN openssl version

WORKDIR /usr/src/mockpass

COPY package* ./
ENV SHOW_LOGIN_PAGE 'true'
RUN npm ci

COPY . ./

CMD ["node", "index.js"]
