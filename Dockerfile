FROM oven/bun:latest

COPY package.json ./
COPY bun.lockb ./

RUN bun install \
    --verbose \
    --no-cache

COPY . .

CMD ["bun", "start"]