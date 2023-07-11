from __future__ import annotations

from pathlib import Path

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

        configuration.DATABASES = {
            'default': {
                'ENGINE': 'django.contrib.gis.db.backends.postgis',
                'NAME': 'django',
                'USER': 'postgres',
                'PASSWORD': 'postgres',
                'HOST': 'postgres',
                'PORT': '5432',
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
