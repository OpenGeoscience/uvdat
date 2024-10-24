import itertools

import pytest

from uvdat.core.models.networks import Network, NetworkEdge, NetworkNode
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
        f'/api/v1/datasets/{dataset.id}/gcc/?project={project.id}&exclude_nodes={connecting_node.id}'
    )

    larger_group: list[NetworkNode] = max(group_a, group_b, key=len)
    assert resp.status_code == 200
    assert sorted(resp.json()) == sorted([n.id for n in larger_group])


@pytest.mark.parametrize('dataset_type', [x[0] for x in Dataset.DatasetType.choices])
@pytest.mark.django_db
def test_rest_dataset_map_layers_incorrect_layer_type(
    authenticated_api_client,
    dataset_factory,
    raster_map_layer_factory,
    vector_map_layer_factory,
    dataset_type,
):
    dataset = dataset_factory(dataset_type=dataset_type)

    # Intentionally create the wrong map layer type
    factory = (
        vector_map_layer_factory
        if dataset_type == Dataset.DatasetType.RASTER
        else raster_map_layer_factory
    )
    for _ in range(3):
        factory(dataset=dataset)

    # Check that nothing is returned, since map_layers will only return map layers that match the dataset's type
    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/map_layers/')
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.parametrize('dataset_type', [x[0] for x in Dataset.DatasetType.choices])
@pytest.mark.django_db
def test_rest_dataset_map_layers(
    authenticated_api_client,
    dataset_factory,
    raster_map_layer_factory,
    vector_map_layer_factory,
    dataset_type,
):
    dataset = dataset_factory(dataset_type=dataset_type)
    factory = (
        vector_map_layer_factory
        if dataset_type == Dataset.DatasetType.VECTOR
        else raster_map_layer_factory
    )
    map_layers = [factory(dataset=dataset) for _ in range(3)]

    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/map_layers/')
    assert resp.status_code == 200

    data: list[dict] = resp.json()
    assert len(data) == 3

    # Assert these lists are the same objects
    assert sorted([x['id'] for x in data]) == sorted([x.id for x in map_layers])


@pytest.mark.django_db
def test_rest_dataset_network_no_network(authenticated_api_client, dataset: Dataset):
    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/network/')
    assert resp.status_code == 200
    assert not resp.json()


@pytest.mark.django_db
def test_rest_dataset_network(
    authenticated_api_client, network, network_edge_factory, network_node_factory
):
    dataset = network.dataset
    network_edge = network_edge_factory(
        network=network,
        from_node=network_node_factory(network=network),
        to_node=network_node_factory(network=network),
    )

    assert network_edge.from_node != network_edge.to_node

    resp = authenticated_api_client.get(f'/api/v1/datasets/{dataset.id}/network/')
    assert resp.status_code == 200

    data: list[dict] = resp.json()
    assert len(data) == 1

    data: dict = data[0]
    assert len(data['nodes']) == 2
    assert len(data['edges']) == 1
