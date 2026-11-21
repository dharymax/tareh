# TAREH Infrastructure

Local development services are defined in the repository-root docker-compose.yml.

Current services:
- PostgreSQL 17
- Redis 7

Production infrastructure is not provisioned by this commit. Before production, add TLS termination, managed secrets, monitoring, database backups, tested restore procedures, network restrictions and a documented deployment/rollback process.
