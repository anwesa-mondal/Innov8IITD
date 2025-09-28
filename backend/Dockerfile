FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# install system deps required to build PyAudio
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      portaudio19-dev \
      libsndfile1 \
      ffmpeg && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "-m", "uvicorn", "ws_server:app", "--host", "0.0.0.0", "--port", "8000"]