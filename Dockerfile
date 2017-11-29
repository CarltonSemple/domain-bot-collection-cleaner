FROM node:boron

WORKDIR /root

COPY cleaner-app ./cleaner-app

WORKDIR /root/cleaner-app
RUN npm install

CMD [ "npm", "start" ]