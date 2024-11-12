FROM node:alpine

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN npm install --verbose --no-cache

COPY . .

CMD ["npm", "start"]
