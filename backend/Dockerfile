FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
COPY admin/package.json ./admin/package.json
RUN npm install

FROM deps AS build
WORKDIR /app
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/tareh_build?schema=public
ENV DIRECT_URL=postgresql://build:build@127.0.0.1:5432/tareh_build?schema=public
COPY backend ./backend
RUN npm --workspace @tareh/backend run prisma:generate
RUN npm --workspace @tareh/backend run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/src/generated ./backend/src/generated
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/prisma.config.ts ./backend/prisma.config.ts
WORKDIR /app/backend
EXPOSE 10000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && MAIN_FILE=$(find dist -type f -name main.js -print -quit) && if [ -z \"$MAIN_FILE\" ]; then echo 'ERROR: NestJS main.js was not found under dist'; find dist -maxdepth 4 -type f | sort; exit 1; fi && echo \"Starting TAREH from $MAIN_FILE\" && node \"$MAIN_FILE\""]
