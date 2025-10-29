import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
import configurations.importer
from django.core.asgi import get_asgi_application
from django.urls import re_path

from geoinsight.core.notifications import AnalyticsConsumer, ConversionConsumer

os.environ['DJANGO_SETTINGS_MODULE'] = 'geoinsight.settings'
if not os.environ.get('DJANGO_CONFIGURATION'):
    raise ValueError('The environment variable "DJANGO_CONFIGURATION" must be set.')
configurations.importer.install()

application = ProtocolTypeRouter(
    {
        'http': get_asgi_application(),
        'websocket': AuthMiddlewareStack(
            URLRouter(
                [
                    # Use re_path instead of path
                    # https://github.com/django/channels/issues/1964#issuecomment-1377663794
                    re_path(
                        'ws/analytics/project/<int:project_id>/results/',
                        AnalyticsConsumer.as_asgi(),
                        name='analytics-ws',
                    ),
                    re_path(
                        'ws/conversion/',
                        ConversionConsumer.as_asgi(),
                        name='conversion-ws',
                    ),
                ]
            )
        ),
    }
)
