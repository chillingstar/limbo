FROM node:alpine

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN npm install --verbose --no-cache

COPY . .

RUN npm run deploy
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
