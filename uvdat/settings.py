from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

from composed_configuration import (
    ComposedConfiguration,
    ConfigMixin,
    DevelopmentBaseConfiguration,
    HerokuProductionBaseConfiguration,
    ProductionBaseConfiguration,
    TestingBaseConfiguration,
)


class UvdatMixin(ConfigMixin):
    WSGI_APPLICATION = 'uvdat.wsgi.application'
    ROOT_URLCONF = 'uvdat.urls'

    BASE_DIR = Path(__file__).resolve(strict=True).parent.parent

    @staticmethod
    def mutate_configuration(configuration: ComposedConfiguration) -> None:
        # Install local apps first, to ensure any overridden resources are found first
        configuration.INSTALLED_APPS = [
            'django.contrib.gis',
            'django_large_image',
            'uvdat.core.apps.CoreConfig',
        ] + configuration.INSTALLED_APPS

        # Install additional apps
        configuration.INSTALLED_APPS += [
            's3_file_field',
        ]

        # Disable authentication requirements for REST
        # TODO: configure authentication and remove this workaround
        configuration.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = []
        configuration.REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES'] = []

        # Re-configure the database for PostGIS
        db_parts = urlparse(os.environ['DJANGO_DATABASE_URL'])
        configuration.DATABASES = {
            'default': {
                'ENGINE': 'django.contrib.gis.db.backends.postgis',
                'NAME': db_parts.path.strip('/'),
                'USER': db_parts.username,
                'PASSWORD': db_parts.password,
                'HOST': db_parts.hostname,
                'PORT': db_parts.port,
            }
        }


class DevelopmentConfiguration(UvdatMixin, DevelopmentBaseConfiguration):
    pass


class TestingConfiguration(UvdatMixin, TestingBaseConfiguration):
    pass


class ProductionConfiguration(UvdatMixin, ProductionBaseConfiguration):
    pass


class HerokuProductionConfiguration(UvdatMixin, HerokuProductionBaseConfiguration):
    pass
