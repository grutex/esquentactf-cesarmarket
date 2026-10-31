# Cesar Market

A simulated grocery store built with PHP, MariaDB, Nginx, HTML, CSS, and JavaScript. All sample accounts, products, balances, and orders are fictional. Do not enter real personal, student, payment, or production data.

## Run locally

1. Copy `.env.example` to `.env` and set unique values for `DB_PASSWORD`, `DB_ROOT_PASSWORD`, and `ADMIN_PASSWORD`.
2. Start the app with `docker compose up -d --build`.
3. Open `http://localhost:8081`.

The server calculates order totals from catalog prices, limits document access to files within the configured documents directory, and renders search text as text. This copy contains no CTF challenge flags or verification bot.

Keep `.env` and deployment credentials out of Git. To use a flag during deployment, store it as a GitHub Actions or hosting-platform secret and provide it to the server through an environment variable; never commit the flag in source, since repository contents can be read by anyone with repository access.

See `frontend/README.md` for frontend structure.
