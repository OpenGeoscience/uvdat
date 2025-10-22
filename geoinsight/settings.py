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
