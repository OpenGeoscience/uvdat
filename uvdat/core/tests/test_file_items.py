from django.urls import reverse
import pytest
import requests
from s3_file_field_client import S3FileFieldClient


@pytest.mark.django_db
def test_upload_and_create_file_item(
    multiframe_vector_file, dataset, live_server, token, authenticated_api_client
):
    session = requests.Session()
    session.headers.update(dict(Authorization=f'Token {token}'))
    s3ff_base_url = reverse('s3_file_field:finalize').replace('finalize/', '')
    s3ff_client = S3FileFieldClient(f'{live_server}{s3ff_base_url}', session)
    with open(multiframe_vector_file['path']) as f:
        s3ff_value = s3ff_client.upload_file(
            file_stream=f,
            file_name=multiframe_vector_file['name'],
            file_content_type=multiframe_vector_file['content_type'],
            field_id='core.FileItem.file',
        )
    fileitem_expected = dict(
        name='multiframe_vector.geojson',
        file=s3ff_value,
        file_type='geojson',
        dataset=dataset.id,
        metadata=dict(
            source='pytest',
        ),
    )
    resp = authenticated_api_client.post('/api/v1/files/', fileitem_expected)
    assert resp.status_code == 201
    serialized_fileitem = resp.json()
    for key, value in fileitem_expected.items():
        if key == 'file':
            assert ':9000/test-django-storage' in serialized_fileitem[key]
        else:
            assert serialized_fileitem[key] == value
    assert 'id' in serialized_fileitem
