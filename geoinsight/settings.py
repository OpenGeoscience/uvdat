from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

from composed_configuration import (
    AllauthMixin,
    CeleryMixin,
    ComposedConfiguration,
    ConfigMixin,
    CorsMixin,
    DatabaseMixin,
    DevelopmentBaseConfiguration,
    DjangoMixin,
    FilterMixin,
    HerokuProductionBaseConfiguration,
    HttpsMixin,
    LoggingMixin,
    MinioStorageMixin,
    ProductionBaseConfiguration,
    RestFrameworkMixin,
    SmtpEmailMixin,
    TestingBaseConfiguration,
    WhitenoiseStaticFileMixin,
)
from configurations import values


class GeoInsightMixin(ConfigMixin):
    ASGI_APPLICATION = 'geoinsight.asgi.application'
    WSGI_APPLICATION = 'geoinsight.wsgi.application'
    ROOT_URLCONF = 'geoinsight.urls'

    BASE_DIR = Path(__file__).resolve(strict=True).parent.parent

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


class DevelopmentConfiguration(GeoInsightMixin, DevelopmentBaseConfiguration):
    pass


class TestingConfiguration(GeoInsightMixin, TestingBaseConfiguration):
    # Ensure celery tasks run synchronously
    CELERY_TASK_EAGER_PROPAGATES = True
    CELERY_TASK_ALWAYS_EAGER = True


class ProductionConfiguration(GeoInsightMixin, ProductionBaseConfiguration):
    pass


class HerokuProductionConfiguration(GeoInsightMixin, HerokuProductionBaseConfiguration):
    pass


class DemoConfiguration(
    GeoInsightMixin,
    MinioStorageMixin,
    SmtpEmailMixin,
    HttpsMixin,
    CeleryMixin,
    RestFrameworkMixin,
    FilterMixin,
    CorsMixin,
    WhitenoiseStaticFileMixin,
    DatabaseMixin,
    LoggingMixin,
    AllauthMixin,
    DjangoMixin,
    ComposedConfiguration,
):
    DEBUG = False
    ALLOWED_HOSTS = values.ListValue(['localhost', '127.0.0.1', 'demo.kitware.com'])

    # Enable proxy header support for reverse proxy deployments
    USE_X_FORWARDED_HOST = True

    # Support deployments under a URL subpath (e.g., /{project}/)
    _proxy_subpath = values.Value(environ_name='DJANGO_{PROJECT}_PROXY_SUBPATH', default=None)
    if _proxy_subpath:
        FORCE_SCRIPT_NAME = _proxy_subpath
