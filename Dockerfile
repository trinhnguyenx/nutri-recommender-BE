# Stage 1: Build the application
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the TypeScript project
RUN npm run build

# Stage 2: Production environment
FROM node:18-alpine AS production

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./

# ❗ Thêm module-alias để alias hoạt động trong runtime
RUN npm install --only=production

# Copy dist folder và cấu hình alias
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
