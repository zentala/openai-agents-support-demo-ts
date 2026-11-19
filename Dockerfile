# Next.js standalone artifact: build with Node 22, then run without build tools or root privileges.
FROM node:22-bookworm-slim AS build
ENV CI=true NEXT_TELEMETRY_DISABLED=1
WORKDIR /src/app
RUN corepack enable
COPY app/package.json app/pnpm-lock.yaml app/pnpm-workspace.yaml ./
RUN corepack pnpm install --frozen-lockfile
COPY app/ ./
# The /readme route reads this file at runtime; the runner also copies it explicitly.
COPY README.md /src/README.md
RUN corepack pnpm build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=10000 HOSTNAME=0.0.0.0
WORKDIR /opt/demo/app
COPY --from=build --chown=node:node /src/app/.next/standalone ./
COPY --from=build --chown=node:node /src/app/.next/static ./.next/static
COPY --from=build --chown=node:node /src/app/public ./public
COPY --from=build --chown=node:node /src/README.md /opt/demo/README.md
RUN mkdir -p .cache && chown node:node .cache
USER node
EXPOSE 10000
CMD ["node", "server.js"]
