import pytest


@pytest.mark.django_db
def test_create_file_item(dataset, s3ff_value, authenticated_api_client):
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
