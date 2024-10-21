import faker
import pytest

from uvdat.core.models.project import Project


@pytest.mark.django_db
def test_project_set_owner(project, user):
    owner = project.owner()
    assert owner.id != user.id

    project.set_owner(user)
    assert project.owner().id == user.id


@pytest.mark.django_db
def test_project_add_followers_collaborators(project, user_factory):
    def sort_func(user):
        return user.id

    users = sorted([user_factory() for _ in range(5)], key=sort_func)
    assert not project.followers()
    assert not project.collaborators()

    project.add_followers(users)

    # Check that users added as collaborators were automatically removed from followers
    project.add_collaborators(users)
    assert not project.followers()
    assert sorted(project.collaborators(), key=sort_func) == users

    # Check that users added as followers were automatically removed from collaborators
    project.add_followers(users)
    assert not project.collaborators()
    assert sorted(project.followers(), key=sort_func) == users


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


@pytest.mark.django_db
def test_rest_project_retrieve(authenticated_api_client, user, project: Project):
    # Not found because user is not added to project
    resp = authenticated_api_client.get(f'/api/v1/projects/{project.id}/')
    assert resp.status_code == 404

    project.add_followers([user])
    resp = authenticated_api_client.get(f'/api/v1/projects/{project.id}/')

    assert resp.json()['owner']['id']
    assert not resp.json()['collaborators']

    followers = resp.json()['followers']
    assert len(followers) == 1
    assert followers[0]['id'] == user.id

    assert resp.json()['datasets'] == []
    assert resp.json()['item_counts'] == {
        'datasets': 0,
        'charts': 0,
        'simulations': 0,
    }
