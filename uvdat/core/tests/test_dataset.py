from pathlib import Path
import tempfile
import time

from django.urls import reverse
import pooch
import pytest
import requests
from s3_file_field_client import S3FileFieldClient

from uvdat.core.models.project import Dataset


@pytest.mark.django_db
def test_rest_dataset_list_retrieve_unauthenticated(api_client):
    resp = api_client.get('/api/v1/datasets/')
    assert resp.status_code == 401


@pytest.mark.django_db
def test_rest_dataset_list_retrieve(authenticated_api_client, dataset: Dataset):
    resp = authenticated_api_client.get('/api/v1/datasets/')
    assert len(resp.json()['results']) == 1
    assert resp.json()['results'][0]['id'] == dataset.id

    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/')
    assert resp.json()['id'] == dataset.id


@pytest.mark.django_db
def test_rest_dataset_layers(
    authenticated_api_client,
    dataset_factory,
    layer_factory,
):
    dataset = dataset_factory()
    layers = [layer_factory(dataset=dataset) for _ in range(3)]

    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/layers/')
    assert resp.status_code == 200

    data: list[dict] = resp.json()
    assert len(data) == 3

    # Assert these lists are the same objects
    assert sorted([x['id'] for x in data]) == sorted([x.id for x in layers])


@pytest.mark.django_db
def test_rest_dataset_data_objects(
    authenticated_api_client,
    dataset_factory,
    vector_data_factory,
    raster_data_factory,
):
    dataset = dataset_factory()
    data_objects = [
        *[vector_data_factory(dataset=dataset) for _ in range(3)],
        *[raster_data_factory(dataset=dataset) for _ in range(3)],
    ]

    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/data/')
    assert resp.status_code == 200

    data: list[dict] = resp.json()
    assert len(data) == 6

    # Assert these lists are the same objects
    assert sorted([x['id'] for x in data]) == sorted([x.id for x in data_objects])


@pytest.mark.django_db
def test_rest_dataset_upload(project, user, authenticated_api_client, live_server, token):
    # Allow user permissions on the project
    project.set_collaborators([user])

    # Create a Dataset
    dataset_expected = dict(
        name='My Test Dataset',
        description='created to test dataset uploads',
        category='test',
        metadata=dict(source='pytest'),
    )
    resp = authenticated_api_client.post('/api/v1/datasets/', dataset_expected)
    assert resp.status_code == 201
    serialized_dataset = resp.json()
    for key, value in dataset_expected.items():
        assert serialized_dataset[key] == value
    assert 'id' in serialized_dataset
    dataset_id = serialized_dataset['id']

    # Add Dataset to Project
    resp = authenticated_api_client.patch(
        f'/api/v1/projects/{project.id}/', dict(datasets=[dataset_id])
    )
    assert resp.status_code == 200

    # Upload a FileItem for the Dataset
    session = requests.Session()
    session.headers.update(dict(Authorization=f'Token {token}'))
    s3ff_base_url = reverse('s3_file_field:finalize').replace('finalize/', '')
    s3ff_client = S3FileFieldClient(f'{live_server}{s3ff_base_url}', session)
    with tempfile.TemporaryDirectory() as tmp:
        test_file_name = 'multiframe_vector.geojson'
        pooch.retrieve(
            url='https://data.kitware.com/api/v1/item/6841f7e0dfcff796fee73d1a/download',
            known_hash='9c24922c9d95fd49f8fd3bafa7ed60f093ac292891a4301bac2be883eeef65ee',
            fname=test_file_name,
            path=tmp,
        )
        test_file_path = Path(tmp, test_file_name)
        assert test_file_path.exists()

        with test_file_path.open('rb') as f:
            s3ff_value = s3ff_client.upload_file(
                file_stream=f,
                file_name=test_file_name,
                file_content_type='application/json',
                field_id='core.FileItem.file',
            )
    fileitem_expected = dict(
        name=test_file_name,
        file=s3ff_value,
        file_type='geojson',
        dataset=dataset_id,
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

    # Spawn conversion task for Dataset
    result_expected = dict(
        name=f'Conversion of Dataset {dataset_id}',
        analysis_type='conversion',
        inputs=dict(
            layer_options=[dict(name='Multiframe Vector Test', frame_property='frame')],
            network_options=None,
            region_options=None,
        ),
        status='Initializing task...',
        outputs=None,
        error=None,
        completed=None,
        project=None,
    )
    resp = authenticated_api_client.post(
        f'/api/v1/datasets/{dataset_id}/convert/', result_expected.get('inputs')
    )
    assert resp.status_code == 200
    serialized_result = resp.json()
    for key, value in result_expected.items():
        assert serialized_result[key] == value
    assert 'id' in serialized_result
    result_id = serialized_result['id']

    # Poll TaskResult object until complete
    while serialized_result['completed'] is None:
        resp = authenticated_api_client.get(f'/api/v1/analytics/{result_id}/')
        assert resp.status_code == 200
        serialized_result = resp.json()
        time.sleep(0.1)
    assert 'Completed' in serialized_result['status']

    # Check that one Layer was created
    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset_id}/layers/')
    serialized_layers = resp.json()
    assert len(serialized_layers) == 1
    assert 'id' in serialized_layers[0]
    layer_id = serialized_layers[0]['id']

    # Check that n LayerFrames were created
    resp = authenticated_api_client.get(f'/api/v1/layers/{layer_id}/frames/')
    serialized_frames = resp.json()
    assert len(serialized_frames) == 39
    vector_properties = serialized_frames[0]['vector']['summary']['properties']
    assert 'frame' in vector_properties
    assert vector_properties['frame']['range'] == [0, 39]
