FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@8.7.6 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000
CMD ["pnpm", "start"]
