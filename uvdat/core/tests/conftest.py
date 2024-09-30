from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
import pytest
from pytest_factoryboy import register
from rest_framework.test import APIClient

from uvdat.core.models import Project

from .factories import UserFactory

USER_INFOS = [
    dict(
        id='superuser',
        username='userA',
        password='testmepassA',
        email='a@fakeemail.com',
        is_superuser=True,
        perm=None,
    ),
    dict(
        id='owner',
        username='userB',
        password='testmepassB',
        email='b@fakeemail.com',
        is_superuser=False,
        perm='owner',
    ),
    dict(
        id='collaborator',
        username='userC',
        password='testmepassC',
        email='c@fakeemail.com',
        is_superuser=False,
        perm='collaborator',
    ),
    dict(
        id='follower',
        username='userD',
        password='testmepassD',
        email='d@fakeemail.com',
        is_superuser=False,
        perm='follower',
    ),
    dict(
        id='no_perms',
        username='userE',
        password='testmepassE',
        email='E@fakeemail.com',
        is_superuser=False,
        perm=None,
    ),
]


@pytest.fixture
def test_project() -> Project:
    return Project.objects.create(
        name='Test Project', default_map_zoom=10, default_map_center=Point(42, -71)
    )


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def permissions_client(user_info, test_project) -> APIClient:
    user_info.pop('perm', None)
    user_info.pop('id', None)
    user = User.objects.create(**user_info)
    client = APIClient()
    client.force_authenticate(user=user)
    return (client, user)


register(UserFactory)
