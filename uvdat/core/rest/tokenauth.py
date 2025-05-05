# Created for the UVDAT Data Explorer, which uses ipyleaflet
# ipyleaflet does not support custom headers, so auth token must be sent as a URL param

from django.contrib.auth.models import User
from oauth2_provider.contrib.rest_framework import OAuth2Authentication


class TokenAuth(OAuth2Authentication):
    @staticmethod
    def get_token_from_query(request) -> str | None:
        token = request.query_params.get('token')
        if token is not None:
            return token

        auth_token = request.headers.get('Authorization')
        if auth_token is not None:
            return auth_token.replace('Token ', '')

    def authenticate(self, request):
        auth = super().authenticate(request)
        if auth is not None:
            return auth

        token = self.get_token_from_query(request)
        if token is None:
            return None

        try:
            user = User.objects.get(auth_token=token)
        except User.DoesNotExist:
            return None

        if not user.is_active:
            return None

        return (user, None)
