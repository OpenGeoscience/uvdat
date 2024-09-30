from django.contrib.gis.geos import LineString, MultiPolygon, Point, Polygon
from guardian.shortcuts import get_perms
import pytest

from uvdat.core.models import (
    Chart,
    Dataset,
    FileItem,
    Network,
    NetworkEdge,
    NetworkNode,
    RasterMapLayer,
    SourceRegion,
    VectorMapLayer,
)

from .conftest import USER_INFOS


def list_endpoint(server, client, viewset_name, **kwargs):
    read_allowed = kwargs.get('read_allowed', False)
    api_root = f'{server.url}/api/v1'
    response = client.get(f'{api_root}/{viewset_name}/', format='json')
    assert response.status_code == 200
    if not read_allowed:
        assert response.json().get('count') == 0
    else:
        assert response.json().get('count') == 1


def fetch_endpoint(server, client, viewset_name, obj_id, **kwargs):
    read_allowed = kwargs.get('read_allowed', False)
    api_root = f'{server.url}/api/v1'
    response = client.get(f'{api_root}/{viewset_name}/{obj_id}/', format='json')
    if not read_allowed:
        assert response.status_code == 404
    else:
        assert response.status_code == 200
        assert response.json().get('id') == obj_id


def create_endpoint(server, client, viewset_name, post_data, **kwargs):
    if post_data is not None:
        api_root = f'{server.url}/api/v1'
        response = client.post(f'{api_root}/{viewset_name}/', post_data, format='json')
        assert response.status_code == 201
        for key, value in post_data.items():
            assert response.json().get(key) == value


def overwrite_endpoint(server, client, viewset_name, obj_id, put_data, **kwargs):
    if put_data is not None:
        read_allowed = kwargs.get('read_allowed', False)
        write_allowed = kwargs.get('write_allowed', False)
        api_root = f'{server.url}/api/v1'
        response = client.put(f'{api_root}/{viewset_name}/{obj_id}/', put_data, format='json')
        if not read_allowed:
            assert response.status_code == 404
        elif not write_allowed:
            assert response.status_code == 403
        else:
            assert response.status_code == 200
            for key, value in put_data.items():
                assert response.json().get(key) == value


def update_endpoint(server, client, viewset_name, obj_id, patch_data, **kwargs):
    if patch_data is not None:
        read_allowed = kwargs.get('read_allowed', False)
        write_allowed = kwargs.get('write_allowed', False)
        api_root = f'{server.url}/api/v1'
        response = client.patch(f'{api_root}/{viewset_name}/{obj_id}/', patch_data, format='json')
        if not read_allowed:
            assert response.status_code == 404
        elif not write_allowed:
            assert response.status_code == 403
        else:
            assert response.status_code == 200
            for key, value in patch_data.items():
                assert response.json().get(key) == value


def delete_endpoint(server, client, viewset_name, obj_id, **kwargs):
    perform_delete = kwargs.get('perform_delete', True)
    read_allowed = kwargs.get('read_allowed', False)
    delete_allowed = kwargs.get('write_allowed', False)
    api_root = f'{server.url}/api/v1'
    if perform_delete:
        response = client.delete(f'{api_root}/{viewset_name}/{obj_id}/', format='json')
        if not read_allowed:
            assert response.status_code == 404
        elif not delete_allowed:
            assert response.status_code == 403
        else:
            assert response.status_code == 204


def viewset_test(
    live_server,
    permissions_client,
    user_info,
    test_project,
    viewset_name,
    obj,
    post_data=None,
    put_data=None,
    patch_data=None,
    perform_delete=True,
):
    client, user = permissions_client
    perm = user_info.get('perm')
    superuser = user_info.get('is_superuser')
    args = [live_server, client, viewset_name]
    kwargs = dict(
        read_allowed=perm is not None or superuser,
        write_allowed=perm in ['collaborator', 'owner'] or superuser,
        delete_allowed=perm == 'owner' or superuser,
        perform_delete=perform_delete,
    )

    # Update project permissions
    if perm is not None:
        test_project.update_permissions(**{perm: [user.id]})
        assert get_perms(user, test_project) == [perm]

    # Test endpoints
    list_endpoint(*args, **kwargs)
    fetch_endpoint(*args, obj.id, **kwargs)
    create_endpoint(*args, post_data, **kwargs)
    overwrite_endpoint(*args, obj.id, put_data, **kwargs)
    update_endpoint(*args, obj.id, patch_data, **kwargs)
    delete_endpoint(*args, obj.id, **kwargs)


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_project_viewset(live_server, permissions_client, user_info, test_project):
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'projects',
        test_project,
        post_data=dict(name='New Project', default_map_center=[42, -71], default_map_zoom=10),
        put_data=dict(
            name='Overwritten Test Project', default_map_center=[42, -71], default_map_zoom=10
        ),
        patch_data=dict(name='Updated Test Project'),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_chart_viewset(live_server, permissions_client, user_info, test_project):
    chart = Chart.objects.create(name='Test Chart', project=test_project)
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'charts',
        chart,
        post_data=dict(name='New Chart'),
        put_data=dict(name='Overwritten Test Chart'),
        patch_data=dict(name='Updated Test Chart'),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_dataset_viewset(live_server, permissions_client, user_info, test_project):
    dataset = Dataset.objects.create(name='Test Dataset')
    test_project.datasets.add(dataset)
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'datasets',
        dataset,
        post_data=dict(name='New Dataset', dataset_type='VECTOR', category='test'),
        put_data=dict(name='Overwritten Test Dataset', dataset_type='VECTOR', category='test'),
        patch_data=dict(name='Updated Test Dataset'),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_files_viewset(live_server, permissions_client, user_info, test_project):
    dataset = Dataset.objects.create(name='Test Dataset')
    test_project.datasets.add(dataset)
    file_item = FileItem.objects.create(name='Test File', dataset=dataset)
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'files',
        file_item,
        patch_data=dict(name='Updated Test File'),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_raster_viewset(live_server, permissions_client, user_info, test_project):
    dataset = Dataset.objects.create(name='Test Dataset')
    test_project.datasets.add(dataset)
    raster = RasterMapLayer.objects.create(dataset=dataset)
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'rasters',
        raster,
        patch_data=dict(index=1),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_vector_viewset(live_server, permissions_client, user_info, test_project):
    dataset = Dataset.objects.create(name='Test Dataset')
    test_project.datasets.add(dataset)
    vector = VectorMapLayer.objects.create(dataset=dataset)
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'vectors',
        vector,
        patch_data=dict(index=1),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_network_viewset(live_server, permissions_client, user_info, test_project):
    dataset = Dataset.objects.create(name='Test Dataset')
    test_project.datasets.add(dataset)
    network = Network.objects.create(dataset=dataset)
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'networks',
        network,
        patch_data=dict(category='foo'),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_node_viewset(live_server, permissions_client, user_info, test_project):
    dataset = Dataset.objects.create(name='Test Dataset')
    test_project.datasets.add(dataset)
    network = Network.objects.create(dataset=dataset)
    node = NetworkNode.objects.create(name='Test Node', network=network, location=Point(42, -71))
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'nodes',
        node,
        patch_data=dict(name='Updated Test Node'),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_edge_viewset(live_server, permissions_client, user_info, test_project):
    dataset = Dataset.objects.create(name='Test Dataset')
    test_project.datasets.add(dataset)
    network = Network.objects.create(dataset=dataset)
    node_1 = NetworkNode.objects.create(name='Test Node', network=network, location=Point(42, -71))
    node_2 = NetworkNode.objects.create(name='Test Node', network=network, location=Point(41, -70))
    edge = NetworkEdge.objects.create(
        name='Test Edge',
        network=network,
        line_geometry=LineString(Point(42, -71), Point(41, -70)),
        from_node=node_1,
        to_node=node_2,
    )
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'edges',
        edge,
        patch_data=dict(name='Updated Test Edge'),
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_region_viewset(live_server, permissions_client, user_info, test_project):
    dataset = Dataset.objects.create(name='Test Dataset')
    test_project.datasets.add(dataset)
    geo_points = (Point(42, -71), Point(41, -70), Point(41.5, -70.5), Point(42, -71))
    region = SourceRegion.objects.create(
        name='Test Region', dataset=dataset, boundary=MultiPolygon(Polygon(geo_points))
    )
    viewset_test(
        live_server,
        permissions_client,
        user_info,
        test_project,
        'source-regions',
        region,
        perform_delete=False,
    )
