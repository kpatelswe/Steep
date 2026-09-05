# Long-lived deployment (a VPS, Railway): serves the SPA and runs the in-process cron.
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm --filter server --prod deploy --legacy /out

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /out .
COPY --from=build /app/server/drizzle ./drizzle
COPY --from=build /app/client/dist ./public
EXPOSE 3000
CMD ["node", "dist/index.js"]
