FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium ffmpeg ca-certificates fonts-liberation fonts-noto-core tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run dashboard:build
ENV NODE_ENV=production BROWSER_EXECUTABLE=/usr/bin/chromium FFMPEG_PATH=/usr/bin/ffmpeg FFPROBE_PATH=/usr/bin/ffprobe CHITRABODH_RUNS_DIR=/tmp/chitrabodh-runs RENDER_CONCURRENCY=1
RUN chown -R node:node /app
USER node
EXPOSE 10000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "scripts/render-start.mjs", "web"]
