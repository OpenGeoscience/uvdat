import os

from django.contrib.auth.models import User
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

        site = Site.objects.get_current()  # type: ignore
        site.domain = 'uvdat.demo'
        site.name = 'UVDAT'
        site.save()

        try:
            user = User.objects.first()
            if Application.objects.filter(user=user).exists():
                raise CommandError(
                    'The client already exists. You can administer it from the admin console.'
                )
            application = Application(
                user=user,
                redirect_uris=uri,
                client_id=client_id,
                name='client-app',
                client_type='public',
                authorization_grant_type='authorization-code',
                skip_authorization=True,
            )
            application.save()
            self.stdout.write(self.style.SUCCESS('Client Application created.'))
        except User.DoesNotExist:
            raise CommandError(
                'A user must exist before creating a client. Use createsuperuser command.'
            )
