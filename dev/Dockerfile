FROM python:3.10-slim
# Install system libraries for Python packages:
RUN apt-get update && \
    apt-get install --no-install-recommends --yes \
    libpq-dev libvips-dev gcc libc6-dev gdal-bin git && \
    rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

COPY ./setup.py /opt/uvdat-server/setup.py
COPY ./manage.py /opt/uvdat-server/manage.py
COPY ./uvdat /opt/uvdat-server/uvdat
RUN pip install large-image[gdal,pil] large-image-converter --find-links https://girder.github.io/large_image_wheels
RUN pip install --editable /opt/uvdat-server[dev]

# Use a directory name which will never be an import name, as isort considers this as first-party.
WORKDIR /opt/uvdat-server
