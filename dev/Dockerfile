FROM python:3.11-slim
# Install system libraries for Python packages:
RUN apt-get update && \
    apt-get install --no-install-recommends --yes \
    libpq-dev libvips-dev gcc libc6-dev gdal-bin git libgl1 libglx-mesa0 && \
    rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ARG TASKS

COPY ./setup.py /opt/geoinsight-server/setup.py
COPY ./manage.py /opt/geoinsight-server/manage.py
COPY ./geoinsight /opt/geoinsight-server/geoinsight

RUN pip install large-image[all] large-image-converter --find-links https://girder.github.io/large_image_wheels
RUN pip install --editable /opt/geoinsight-server[dev]

RUN if [ "$TASKS" = "1" ]; \
    then pip install --editable /opt/geoinsight-server[tasks]; \
    # Install tile2net (may take up to 30 mins)
    git clone https://github.com/VIDA-NYU/tile2net.git; \
    python -m pip install ./tile2net; \
    fi

# Use a directory name which will never be an import name, as isort considers this as first-party.
WORKDIR /opt/geoinsight-server
