import itertools

import pytest

from uvdat.core.models.networks import Network, NetworkNode
from uvdat.core.models.project import Dataset, Project


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
def test_rest_dataset_gcc_no_networks(authenticated_api_client, dataset: Dataset, project: Project):
    project.datasets.add(dataset)
    resp = authenticated_api_client.get(
        f'/api/v1/datasets/{dataset.id}/gcc/?project={project.id}&exclude_nodes=1'
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_rest_dataset_gcc_empty_network(
    authenticated_api_client, project: Project, network: Network
):
    dataset = network.dataset
    project.datasets.add(dataset)
    resp = authenticated_api_client.get(
        f'/api/v1/datasets/{dataset.id}/gcc/?project={project.id}&exclude_nodes=1'
    )

    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.parametrize('group_sizes', [(3, 2), (20, 3)])
@pytest.mark.django_db
def test_rest_dataset_gcc(
    authenticated_api_client,
    project: Project,
    network: Network,
    network_edge_factory,
    network_node_factory,
    group_sizes,
):
    group_a_size, group_b_size = group_sizes

    # Create two groups of nodes that fully connected
    group_a = [network_node_factory(network=network) for _ in range(group_a_size)]
    for from_node, to_node in itertools.combinations(group_a, 2):
        network_edge_factory(network=network, from_node=from_node, to_node=to_node)

    group_b = [network_node_factory(network=network) for _ in range(group_b_size)]
    for from_node, to_node in itertools.combinations(group_b, 2):
        network_edge_factory(network=network, from_node=from_node, to_node=to_node)

    # Join these two groups by a single node
    connecting_node: NetworkNode = network_node_factory(network=network)
    network_edge_factory(network=network, from_node=group_a[0], to_node=connecting_node)
    network_edge_factory(network=network, from_node=group_b[0], to_node=connecting_node)

    # Network should look like this
    #  *             *
    #  |             |
    #  * ---- * ---- *
    #  |
    #  *

    dataset = network.dataset
    project.datasets.add(dataset)
    resp = authenticated_api_client.get(
        f'/api/v1/datasets/{dataset.id}/gcc/'
        f'?project={project.id}&exclude_nodes={connecting_node.id}'
    )

    larger_group: list[NetworkNode] = max(group_a, group_b, key=len)
    assert resp.status_code == 200
    assert sorted(resp.json()) == sorted([n.id for n in larger_group])


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


@pytest.mark.django_db
def test_rest_dataset_network_no_network(authenticated_api_client, dataset: Dataset):
    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/network/')
    assert resp.status_code == 200
    assert not resp.json()


@pytest.mark.django_db
def test_rest_dataset_network(authenticated_api_client, network_edge):
    network = network_edge.network
    dataset = network.dataset
    assert network_edge.from_node != network_edge.to_node

    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/network/')
    assert resp.status_code == 200

    data: list[dict] = resp.json()
    assert len(data) == 1

    data: dict = data[0]
    assert len(data['nodes']) == 2
    assert len(data['edges']) == 1
