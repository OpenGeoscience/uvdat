import pytest

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

    print(data)
    # Assert these lists are the same objects
    assert sorted([x['id'] for x in data]) == sorted([x.id for x in data_objects])
