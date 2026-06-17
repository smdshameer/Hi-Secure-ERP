FROM node:18-alpine

WORKDIR /app

# Copy package descriptors first to leverage caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including typescript compiler
RUN npm ci

# Copy source code and prisma schema
COPY src ./src
COPY prisma ./prisma

# Generate Prisma Client and compile typescript
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

EXPOSE 3004

ENV NODE_ENV=production
ENV PORT=3004

# Run the server using PM2 or directly
CMD ["node", "dist/index.js"]
