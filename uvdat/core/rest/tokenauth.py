# Created for the UVDAT Data Explorer, which uses ipyleaflet
# ipyleaflet does not support custom headers, so auth token must be sent as a URL param

from django.contrib.auth.models import User
from oauth2_provider.contrib.rest_framework import OAuth2Authentication


class TokenAuth(OAuth2Authentication):
    def authenticate(self, request):
        token = request.query_params.get('token')
        if token is None:
            token_string = request.headers.get('Authorization')
            token = token_string.replace('Token ', '')
        if token is not None:
            try:
                user = User.objects.get(auth_token=token)
            except User.DoesNotExist:
                return None

            if not user.is_active:
                return None
            return (user, None)
        return None
