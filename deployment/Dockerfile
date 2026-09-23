FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# The server imports the pure simulation plus the shared map generator. The
# map generator is loaded from public/engine/map-biomes.js at runtime, so the
# public directory is part of the server image even though the client itself
# is deployed separately as dist/.
COPY server ./server
COPY shared ./shared
COPY public ./public

RUN test -f server/index.js \
  && test -f shared/simulation/GameSimulation.js \
  && test -f shared/maps/MapDefinitions.js \
  && test -f public/engine/map-biomes.js

ENV NODE_ENV=production
ENV PORT=3200

EXPOSE 3200

CMD ["node", "server/index.js"]
