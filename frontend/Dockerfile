FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG PUBLIC_API_URL=http://localhost:3001
ARG PUBLIC_WS_URL=ws://localhost:3001
ARG PUBLIC_MC_URL=http://localhost:8080
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_WS_URL=$PUBLIC_WS_URL
ENV PUBLIC_MC_URL=$PUBLIC_MC_URL

RUN npm run build

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

ARG PUBLIC_API_URL=http://localhost:3001
ARG PUBLIC_WS_URL=ws://localhost:3001
ARG PUBLIC_MC_URL=http://localhost:8080
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_WS_URL=$PUBLIC_WS_URL
ENV PUBLIC_MC_URL=$PUBLIC_MC_URL
ENV PORT=5173
ENV HOST=0.0.0.0
EXPOSE 5173

CMD ["node", "build"]
