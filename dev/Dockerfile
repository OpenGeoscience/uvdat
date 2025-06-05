FROM python:3.10-slim
# Install system libraries for Python packages:
RUN apt-get update && \
    apt-get install --no-install-recommends --yes \
    libpq-dev libvips-dev gcc libc6-dev gdal-bin git libgl1-mesa-glx && \
    rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install tile2net (may take up to 30 mins)
RUN git clone https://github.com/VIDA-NYU/tile2net.git
RUN python -m pip install ./tile2net

COPY ./setup.py /opt/uvdat-server/setup.py
COPY ./manage.py /opt/uvdat-server/manage.py
COPY ./uvdat /opt/uvdat-server/uvdat
RUN pip install large-image[all] large-image-converter --find-links https://girder.github.io/large_image_wheels
RUN pip install --editable /opt/uvdat-server[dev]

# Use a directory name which will never be an import name, as isort considers this as first-party.
WORKDIR /opt/uvdat-server
