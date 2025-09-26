import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
import configurations.importer
from django.core.asgi import get_asgi_application
from django.urls import path

from uvdat.core.notifications import AnalyticsConsumer, ConversionConsumer

os.environ['DJANGO_SETTINGS_MODULE'] = 'uvdat.settings'
if not os.environ.get('DJANGO_CONFIGURATION'):
    raise ValueError('The environment variable "DJANGO_CONFIGURATION" must be set.')
configurations.importer.install()

application = ProtocolTypeRouter(
    {
        'http': get_asgi_application(),
        'websocket': AuthMiddlewareStack(
            URLRouter(
                [
                    path(
                        'ws/analytics/project/<int:project_id>/results/',
                        AnalyticsConsumer.as_asgi(),
                        name='analytics-ws',
                    ),
                    path(
                        'ws/conversion/',
                        ConversionConsumer.as_asgi(),
                        name='conversion-ws',
                    ),
                ]
            )
        ),
    }
)
