from pathlib import Path
import tempfile

from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
from django.urls import reverse
import pooch
import pytest
import requests
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from s3_file_field_client import S3FileFieldClient

from uvdat.core.models import Dataset, Project

from .factory_fixtures import *  # noqa: F403, F401

TEST_FILE = dict(
    name='multiframe_vector.geojson',
    file_type='geojson',
    content_type='application/json',
    url='https://data.kitware.com/api/v1/item/6841f7e0dfcff796fee73d1a/download',
    hash='9c24922c9d95fd49f8fd3bafa7ed60f093ac292891a4301bac2be883eeef65ee',
)


@pytest.fixture
def project_owner(project: Project) -> User:
    return project.owner()


@pytest.fixture
def project_collaborator(user, project: Project) -> User:
    project.add_collaborators([user])
    return user


@pytest.fixture
def project_follower(user, project: Project) -> User:
    project.add_followers([user])
    return user


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
    project = Project.objects.create(
        name='Test Project', default_map_zoom=10, default_map_center=Point(42, -71)
    )
    original_owner = User.objects.create(username='testowner')
    project.set_permissions(owner=original_owner)
    return project


@pytest.fixture
def test_dataset(user, test_project) -> Dataset:
    dataset = Dataset.objects.create(
        name='Test Dataset', description='My test dataset', category='test'
    )
    test_project.set_collaborators([user])
    test_project.datasets.set([dataset])
    return dataset


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def authenticated_api_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def token(user) -> str:
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


@pytest.fixture
def permissions_client(user_info, test_project) -> APIClient:
    user_info.pop('perm', None)
    user_info.pop('id', None)
    user = User.objects.create(**user_info)
    client = APIClient()
    client.force_authenticate(user=user)
    return (client, user)


@pytest.fixture
def s3ff_value(live_server, token) -> str:
    session = requests.Session()
    session.headers.update(dict(Authorization=f'Token {token}'))
    s3ff_base_url = reverse('s3_file_field:finalize').replace('finalize/', '')
    s3ff_client = S3FileFieldClient(f'{live_server}{s3ff_base_url}', session)
    with tempfile.TemporaryDirectory() as tmp:
        pooch.retrieve(
            url=TEST_FILE['url'],
            known_hash=TEST_FILE['hash'],
            fname=TEST_FILE['name'],
            path=tmp,
        )
        test_file_path = Path(tmp, TEST_FILE['name'])
        with test_file_path.open('rb') as f:
            return s3ff_client.upload_file(
                file_stream=f,
                file_name=TEST_FILE['name'],
                file_content_type=TEST_FILE['content_type'],
                field_id='core.FileItem.file',
            )


@pytest.fixture
def test_file_item(test_dataset, s3ff_value, authenticated_api_client):
    # Creating FileItem directly gets a NoSuchKey S3Error, must use API to create
    resp = authenticated_api_client.post(
        '/api/v1/files/',
        dict(
            name=TEST_FILE['name'],
            file=s3ff_value,
            file_type=TEST_FILE['file_type'],
            dataset=test_dataset.id,
        ),
    )
    return resp.json()
