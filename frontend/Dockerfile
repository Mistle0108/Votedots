ARG NODE_VERSION

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
