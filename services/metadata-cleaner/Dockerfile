FROM python:3.12-slim

ENV UV_TOOL_DIR="/opt/uv-tools"
ENV UV_TOOL_BIN_DIR="/usr/local/bin"

RUN pip install --no-cache-dir uv \
    && uv tool install remove-ai-watermarks
WORKDIR /app
COPY server.py /app/server.py

USER 65534:65534
EXPOSE 8080
CMD ["python", "/app/server.py"]
