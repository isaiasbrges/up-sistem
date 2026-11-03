FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server ./server
COPY app ./app
COPY design-system ./design-system
COPY index.html ./index.html
COPY deployment/initialize.js ./deployment/initialize.js
USER node
EXPOSE 3000
CMD ["node","server/run.js"]
