# Limbo v2 ⚡
Limbo is a chat app, written in Next.js and uses Socket.io for transmitting messages.

[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/chillingstar/limbo)](https://github.com/chillingstar/limbo/commits)
[![GitHub last commit](https://img.shields.io/github/last-commit/chillingstar/limbo)](https://github.com/chillingstar/limbo/commits)

## Features
- Real-time messaging (with Socket.io)
- User authentication and registration
- Fast and responsive UI (with React)
- Lightweight and scalable architecture

## Deployment

### Docker 🐳
> Requirement: [Docker](https://docs.docker.com/get-docker/), a supported database ([PostgreSQL](https://postgresql.org), [MySQL](https://mysql.com/), [MariaDB](https://mariadb.org/), [SQLite](https://sqlite.org/), [Microsoft SQL Server](https://microsoft.com/sql-server), [MongoDB](https://mongodb.com/) or [CockroachDB](https://cockroachlabs.com/))

0. Preparation:
    - Change the provider in schema.prisma, to the database you want to use.

1. Clone the repository:
    ```bash
    git clone https://github.com/chillingstar/limbo.git
    ```
2. Change into the directory, and set the environment variables required for the app.
3. Build the Docker image:
    ```bash
    docker build -t limbo .
    ```
4. Run the Docker container:
    ```bash
    docker run -d -p 3000:3000 -e DATABASE_URL=your_database_url -e SERVER_NAME=Limbo limbo
    ```
    or whatever port you want to assign to Limbo.

    If you want to use .env, create one, enter all of the environments and run:
    ```bash
    docker run -d -p 3000:3000 --env-file .env limbo
    ```

And voila! You have Limbo running on your Docker container.

### Manual Deployment
> Requirement: [Bun](https://bun.sh) (or you could use npm but you must regenerate the lockfile using `npm install`.), a supported database ([PostgreSQL](https://postgresql.org), [MySQL](https://mysql.com/), [MariaDB](https://mariadb.org/), [SQLite](https://sqlite.org/), [Microsoft SQL Server](https://microsoft.com/sql-server), [MongoDB](https://mongodb.com/) or [CockroachDB](https://cockroachlabs.com/))

1. Clone the repository:
    ```bash
    git clone https://github.com/chillingstar/limbo.git
    ```
2. Change into the directory, and set the environment variables required for the app.
3. Install the dependencies:
    ```bash
    bun install
    ```
4. Build the app:
    ```bash
    bun run build
    ```
5. Start the app:
    ```bash
    bun run start
    ```

And voila! You have Limbo running on your local machine.

## Contributing
Contributions are welcome! If you find any bugs or have suggestions for improvements, please open an issue or submit a pull request.

## License
This project is licensed under custom licenses - see the [LICENSE](LICENSE) file for details.