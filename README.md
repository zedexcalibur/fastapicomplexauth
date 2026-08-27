# FastAPI Complex Auth

A full-stack authentication application built with FastAPI, React, PostgreSQL and Docker.

The application implements user registration, login, logout, JWT authentication, refresh-token rotation and password reset functionality.

## Technologies

### Backend
- Python
- FastAPI
- SQLModel / SQLAlchemy
- PostgreSQL
- JWT authentication
- Uvicorn

### Frontend
- React
- Vite
- Axios
- React Router

### Infrastructure
- Docker
- Docker Compose
- Nginx

## Features

- User registration
- User login
- JWT authentication
- Refresh tokens
- Refresh token rotation
- Logout
- Password reset
- Password change
- Protected API endpoints
- PostgreSQL database
- Dockerised development environment

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- .env files

### .env files
1. Create an .env file in the main directory with:
POSTGRES_USER=complexauth
POSTGRES_PASSWORD=mysecretpassword
POSTGRES_DB=complexauth
DATABASE_URL=postgresql://complexauth:mysecretpassword@database:5432/complexauth

2. Create an .env file in complexauthfrontend with:
VITE_API_URL=http://localhost:8000

## Running the development version

### Start the application

From the project root directory, run:
  docker compose up --build
The frontend is available at:
  http://localhost:5173
The FastAPI backend is available at:
  http://localhost:8000

### Stop the application

Press `Ctrl+C` in the terminal or run:
  docker compose down

## Running the production version

### Start the application

From the project root directory, run:
  docker compose -f compose.production.yaml up --build
The application is then available at:
  http://localhost

### Stop the application

Press `Ctrl+C` in the terminal or run:
  docker compose -f compose.production.yaml down