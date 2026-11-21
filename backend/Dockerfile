FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
COPY admin/package.json ./admin/package.json
RUN npm install

FROM deps AS build
WORKDIR /app
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/tareh_build?schema=public
COPY backend ./backend
RUN npm --workspace @tareh/backend run prisma:generate
RUN npm --workspace @tareh/backend run build

FROM node:22-bookworm-slim AS runtime
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
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
