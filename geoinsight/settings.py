from __future__ import annotations

import os
from pathlib import Path

from composed_configuration import (
    ComposedConfiguration,
    ConfigMixin,
    DevelopmentBaseConfiguration,
    HerokuProductionBaseConfiguration,
    ProductionBaseConfiguration,
    TestingBaseConfiguration,
)
from configurations import values
import osgeo


class GeoInsightMixin(ConfigMixin):
    ASGI_APPLICATION = 'geoinsight.asgi.application'
    WSGI_APPLICATION = 'geoinsight.wsgi.application'
    ROOT_URLCONF = 'geoinsight.urls'

    BASE_DIR = Path(__file__).resolve(strict=True).parent.parent

    # Re-configure the database for PostGIS
    DATABASES = values.DatabaseURLValue(
        environ_name='DATABASE_URL',
        environ_prefix='DJANGO',
        environ_required=True,
        engine='django.contrib.gis.db.backends.postgis',
    )

    # Override default signup sheet to ask new users for first and last name
    ACCOUNT_FORMS = {'signup': 'geoinsight.core.rest.accounts.AccountSignupForm'}

    HOMEPAGE_REDIRECT_URL = values.URLValue(environ_required=True)

    # django-guardian; disable anonymous user permissions
    ANONYMOUS_USER_NAME = None

    # django-guardian; raise PermissionDenied exception instead of redirecting to login page
    GUARDIAN_RAISE_403 = True

    # django-channels with redis
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                # Use /1 for channels backend, as /0 is used by celery
                'hosts': [f'{os.environ["REDIS_URL"]}/1'],
            },
        }
    }

    # https://github.com/girder/large_image_wheels#geodjango
    GDAL_LIBRARY_PATH = osgeo.GDAL_LIBRARY_PATH
    GEOS_LIBRARY_PATH = osgeo.GEOS_LIBRARY_PATH

    ENABLE_TASK_FLOOD_SIMULATION = values.BooleanValue(True)
    ENABLE_TASK_FLOOD_NETWORK_FAILURE = values.BooleanValue(True)
    ENABLE_TASK_NETWORK_RECOVERY = values.BooleanValue(True)
    ENABLE_TASK_GEOAI_SEGMENTATION = values.BooleanValue(True)
    ENABLE_TASK_TILE2NET_SEGMENTATION = values.BooleanValue(True)
    ENABLE_TASK_CREATE_ROAD_NETWORK = values.BooleanValue(True)

    @staticmethod
    def mutate_configuration(configuration: ComposedConfiguration) -> None:
        # Install local apps first, to ensure any overridden resources are found first
        configuration.INSTALLED_APPS = [
            'daphne',
            'django.contrib.gis',
            'django_large_image',
            'guardian',
            'geoinsight.core.apps.CoreConfig',
        ] + configuration.INSTALLED_APPS

        # Install additional apps
        configuration.INSTALLED_APPS += [
            's3_file_field',
        ]

        configuration.AUTHENTICATION_BACKENDS += ['guardian.backends.ObjectPermissionBackend']
        configuration.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] += [
            'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
            'rest_framework.authentication.TokenAuthentication',
        ]
        configuration.REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES'] = [
            'rest_framework.permissions.IsAuthenticated'
        ]


class DevelopmentConfiguration(GeoInsightMixin, DevelopmentBaseConfiguration):
    pass


class TestingConfiguration(GeoInsightMixin, TestingBaseConfiguration):
    # Ensure celery tasks run synchronously
    CELERY_TASK_EAGER_PROPAGATES = True
    CELERY_TASK_ALWAYS_EAGER = True


class ProductionConfiguration(GeoInsightMixin, ProductionBaseConfiguration):
    pass


class HerokuProductionConfiguration(GeoInsightMixin, HerokuProductionBaseConfiguration):
    DATABASES = values.DatabaseURLValue(
        environ_name='DATABASE_URL',
        environ_prefix=None,
        environ_required=True,
        engine='django.contrib.gis.db.backends.postgis',
        ssl_require=True,
        options=dict(
            pool=dict(
                # We have 20 available postgres connections on our service tier, and some
                # will be required by the workers and maybe other miscellaneous access.
                max_size=12,
            )
        ),
    )
