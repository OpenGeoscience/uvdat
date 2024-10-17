import faker
import pytest


@pytest.mark.django_db
def test_rest_project_create_no_datasets(authenticated_api_client):
    fake = faker.Faker()
    resp = authenticated_api_client.post(
        '/api/v1/projects/',
        data={
            'name': fake.name(),
            'default_map_zoom': fake.pyfloat(min_value=0, max_value=22),
            'default_map_center': [fake.latitude(), fake.longitude()],
        },
    )

    assert resp.status_code == 201


@pytest.mark.django_db
def test_rest_project_create_with_datasets(authenticated_api_client, dataset_factory):
    fake = faker.Faker()

    datasets = [dataset_factory().id for _ in range(3)]
    resp = authenticated_api_client.post(
        '/api/v1/projects/',
        data={
            'name': fake.name(),
            'default_map_zoom': fake.pyfloat(min_value=0, max_value=22),
            'default_map_center': [fake.latitude(), fake.longitude()],
            'datasets': datasets,
        },
    )

    assert resp.status_code == 201
