# ─── Stage: Runtime ───────────────────────────────────────────────────────────
FROM node:20-slim

# Install Chromium and its dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

# Create a directory for the persistent SQLite database
# (docker-compose will mount a volume here)
RUN mkdir -p /app/data

EXPOSE 5000

CMD ["node", "index.js"]
