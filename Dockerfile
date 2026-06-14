# Stage 1: Build the React/Vite frontend
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-slim AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port Cloud Run expects
ENV PORT=8080
EXPOSE 8080

# Start the app using vite preview to serve the built files
CMD ["npx", "vite", "preview", "--port", "8080", "--host", "0.0.0.0"]
