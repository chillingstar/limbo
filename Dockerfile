# Use the official Bun image based on Alpine Linux as the base image
FROM bun:alpine

# Set the working directory inside the container to /limbo
WORKDIR /limbo

# Copy the package.json and bun lockfile to the working directory
COPY package.json ./package.json
COPY bun.lockb ./bun.lockb

# Install the production dependencies using Bun with a frozen lockfile and silent output
RUN bun install --production --frozen-lockfile --silent

# Copy all files from the current directory to the working directory in the container
COPY . .

# Generating the prisma client using the schema
RUN bun x prisma generate

# Building the Next.js application
RUN bun run build

# Set the default command to run the application using Bun
CMD ["bun", "run", "start"]