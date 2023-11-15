FROM node:20

WORKDIR /app

COPY package*.json ./
#COPY patches ./patches/
#COPY prisma ./prisma/

RUN npm install -g @nestjs/cli

RUN npm ci --unsafe-perm

COPY . .

#COPY ./production.env .env

RUN rm -rf dist

RUN npm run build

RUN npm prune --production

CMD [ "npm", "run", "start:prod" ]
