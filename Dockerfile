FROM node:24.13.0-bookworm-slim
SHELL ["/bin/bash","-lc"]

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    git \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
 && rm -rf /var/lib/apt/lists/*

ENV npm_config_python=/usr/bin/python3

WORKDIR /work
