FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace=@ghost/server --include-workspace-root=false --no-audit --no-fund
COPY apps/server/src ./apps/server/src
COPY packages/shared/src ./packages/shared/src
RUN find apps/server/src -type f \( -name '*.test.ts' -o -name '*.integration.ts' \) -delete

FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85
# Preserve TLS roots, remove unused vulnerable utilities and package managers.
RUN apk add --no-network ca-certificates-bundle \
    && rm -rf /usr/local/lib/node_modules /opt/yarn* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn* /usr/local/bin/docker-entrypoint.sh \
    && apk del --no-network alpine-baselayout alpine-baselayout-data busybox busybox-binsh ssl_client apk-tools
# Keep distro identification for accurate vulnerability scans after removing base utilities.
COPY --from=dependencies /etc/os-release /etc/alpine-release /etc/
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY apps/server/package.json ./package.json
COPY --from=dependencies /app/apps/server/src ./apps/server/src
COPY --from=dependencies /app/packages/shared/src ./packages/shared/src
ENV NODE_ENV=production PORT=3011
USER 1000:1000
EXPOSE 3011
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD ["/usr/local/bin/node", "-e", "fetch('http://127.0.0.1:3011/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["/usr/local/bin/node"]
CMD ["apps/server/src/index.ts"]
