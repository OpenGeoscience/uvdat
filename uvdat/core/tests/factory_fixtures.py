import pytest

from uvdat.core.models import Project

from .factories import (
    DatasetFactory,
    NetworkEdgeFactory,
    NetworkFactory,
    NetworkNodeFactory,
    ProjectFactory,
    RasterMapLayerFactory,
    SuperUserFactory,
    UserFactory,
    VectorMapLayerFactory,
)


# User
@pytest.fixture
def user_factory():
    return UserFactory


@pytest.fixture
def user(user_factory):
    return user_factory()


@pytest.fixture
def superuser_factory():
    return SuperUserFactory


@pytest.fixture
def superuser(superuser_factory):
    return superuser_factory()


# Project
@pytest.fixture
def project_factory():
    return ProjectFactory


# Ensure that when a project is created, it always has an owner
@pytest.fixture
def project(user_factory, project_factory) -> Project:
    project = project_factory()
    project.set_owner(user_factory())
    return project


# Dataset
@pytest.fixture
def dataset_factory():
    return DatasetFactory


@pytest.fixture
def dataset(dataset_factory):
    return dataset_factory()


# Network
@pytest.fixture
def network_factory():
    return NetworkFactory


@pytest.fixture
def network(network_factory):
    return network_factory()


# Network Node
@pytest.fixture
def network_node_factory():
    return NetworkNodeFactory


@pytest.fixture
def network_node(network_node_factory):
    return network_node_factory()


# Network Edge
@pytest.fixture
def network_edge_factory():
    return NetworkEdgeFactory


@pytest.fixture
def network_edge(network_edge_factory):
    return network_edge_factory()


# Raster Map Layer
@pytest.fixture
def raster_map_layer_factory():
    return RasterMapLayerFactory


@pytest.fixture
def raster_map_layer(raster_map_layer_factory):
    return raster_map_layer_factory()


# Vector Map Layer
@pytest.fixture
def vector_map_layer_factory():
    return VectorMapLayerFactory


@pytest.fixture
def vector_map_layer(vector_map_layer_factory):
    return vector_map_layer_factory()
