# Load the bun image
FROM oven/bun:alpine

WORKDIR /app

# Copying the required package.json and lockfiles to install
COPY package.json ./
COPY bun.lockb ./

# Install the dependencies
RUN bun install --silent --frozen-lockfile

# Copy the source code to the container
COPY . .

# Build the application
RUN bun run build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["bun", "run", "start"]