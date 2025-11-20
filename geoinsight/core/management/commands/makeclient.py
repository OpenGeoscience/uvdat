import os

from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand, CommandError
from oauth2_provider.models import Application


class Command(BaseCommand):
    help = 'Creates a client Application object for authentication purposes.'

    def handle(self, **kwargs):
        uri = os.environ.get('VUE_APP_BASE_URL')
        client_id = os.environ.get('VUE_APP_OAUTH_CLIENT_ID')
        if uri is None:
            raise CommandError('Environment variable VUE_APP_BASE_URL is not set.')
        if client_id is None:
            raise CommandError('Environment variable VUE_APP_OAUTH_CLIENT_ID is not set.')

        site = Site.objects.get_current()
        site.domain = 'geoinsight.demo'
        site.name = 'GeoInsight'
        site.save()

        _, created = Application.objects.get_or_create(
            name='client-app',
            defaults={
                'redirect_uris': uri,
                'client_id': client_id,
                'client_type': 'public',
                'authorization_grant_type': 'authorization-code',
                'skip_authorization': True,
            },
        )
        if not created:
            raise CommandError(
                'The client already exists. You can administer it from the admin console.'
            )
        self.stdout.write(self.style.SUCCESS('Client Application created.'))
