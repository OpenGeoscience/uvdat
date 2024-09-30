from django.contrib.auth.models import User
from django.contrib.gis.geos import LineString, MultiPolygon, Point, Polygon
from guardian.shortcuts import get_perms
import pytest
from rest_framework.test import APIClient

from uvdat.core.models import (
    Chart,
    Dataset,
    DerivedRegion,
    FileItem,
    Network,
    NetworkEdge,
    NetworkNode,
    Project,
    RasterMapLayer,
    SourceRegion,
    VectorFeature,
    VectorMapLayer,
)

USER_INFOS = [
    dict(
        id='superuser',
        username='userA',
        password='testmepassA',
        email='a@fakeemail.com',
        is_superuser=True,
        perm=None,
    ),
    dict(
        id='owner',
        username='userB',
        password='testmepassB',
        email='b@fakeemail.com',
        is_superuser=False,
        perm='owner',
    ),
    dict(
        id='collaborator',
        username='userC',
        password='testmepassC',
        email='c@fakeemail.com',
        is_superuser=False,
        perm='collaborator',
    ),
    dict(
        id='follower',
        username='userD',
        password='testmepassD',
        email='d@fakeemail.com',
        is_superuser=False,
        perm='follower',
    ),
    dict(
        id='no_perms',
        username='userE',
        password='testmepassE',
        email='E@fakeemail.com',
        is_superuser=False,
        perm=None,
    ),
]

VIEWS = [
    dict(
        obj_key='chart',
        base='charts',
        post_data=dict(name='New Chart'),
        put_data=dict(name='Overwritten Test Chart'),
        patch_data=dict(name='Updated Test Chart'),
    ),
    dict(
        obj_key='file_item',
        base='files',
        post_data=None,
        put_data=None,
        patch_data=dict(name='Updated Test File'),
    ),
    dict(
        obj_key='raster',
        base='rasters',
        post_data=None,
        put_data=None,
        patch_data=dict(index=1),
    ),
    dict(
        obj_key='vector',
        base='vectors',
        post_data=None,
        put_data=None,
        patch_data=dict(index=2),
    ),
    dict(
        # No edit/delete methods allowed for regions
        obj_key='region',
        base='source-regions',
        post_data=None,
        put_data=None,
        patch_data=None,
        perform_delete=False,
    ),
    dict(
        obj_key='edge',
        base='edges',
        post_data=None,
        put_data=None,
        patch_data=dict(name='Updated Test Edge'),
    ),
    dict(
        obj_key='node_1',
        base='nodes',
        post_data=None,
        put_data=None,
        patch_data=dict(name='Updated Test Node'),
        expected_count=2,
    ),
    dict(
        obj_key='network',
        base='networks',
        post_data=None,
        put_data=None,
        patch_data=dict(category='foo'),
    ),
    dict(
        obj_key='dataset',
        base='datasets',
        post_data=dict(name='New Dataset', dataset_type='VECTOR', category='test'),
        put_data=dict(name='Overwritten Test Dataset', dataset_type='VECTOR', category='test'),
        patch_data=dict(name='Updated Test Dataset'),
    ),
    dict(
        obj_key='project',
        base='projects',
        post_data=dict(name='New Project', default_map_center=[42, -71], default_map_zoom=10),
        put_data=dict(
            name='Overwritten Test Project', default_map_center=[42, -71], default_map_zoom=10
        ),
        patch_data=dict(name='Updated Test Project'),
    ),
]


def create_objects():
    geo_points = (Point(42, -71), Point(41, -70), Point(41.5, -70.5), Point(42, -71))
    project = Project.objects.create(
        name='Permission Test', default_map_zoom=10, default_map_center=geo_points[0]
    )
    chart = Chart.objects.create(name='Test Chart', project=project)
    dataset = Dataset.objects.create(name='Test Dataset')
    file_item = FileItem.objects.create(name='Test File', dataset=dataset)
    raster = RasterMapLayer.objects.create(dataset=dataset)
    vector = VectorMapLayer.objects.create(dataset=dataset)
    # VectorFeature does not have API Viewset yet
    # feature = VectorFeature.objects.create(map_layer=vector, geometry=geo_points[0], properties={})
    network = Network.objects.create(dataset=dataset)
    node_1 = NetworkNode.objects.create(name='Test Node', network=network, location=geo_points[0])
    node_2 = NetworkNode.objects.create(name='Test Node', network=network, location=geo_points[1])
    edge = NetworkEdge.objects.create(
        name='Test Edge',
        network=network,
        line_geometry=LineString(geo_points[0], geo_points[1]),
        from_node=node_1,
        to_node=node_2,
    )
    region = SourceRegion.objects.create(
        name='Test Region', dataset=dataset, boundary=MultiPolygon(Polygon(geo_points))
    )
    project.datasets.add(dataset)
    return dict(
        project=project,
        chart=chart,
        dataset=dataset,
        file_item=file_item,
        raster=raster,
        vector=vector,
        # feature=feature,
        network=network,
        node_1=node_1,
        node_2=node_2,
        edge=edge,
        region=region,
    )


@pytest.mark.parametrize('user_info', USER_INFOS, ids=[u.get('id') for u in USER_INFOS])
@pytest.mark.django_db
def test_permissions(user_info, live_server):
    # Set up client
    api_root = f'{live_server.url}/api/v1'
    test_id = user_info.pop('id')
    perm = user_info.pop('perm')
    user = User.objects.create(**user_info)
    client = APIClient()
    client.force_authenticate(user=user)
    print('Test', test_id)

    # expected permissions
    read_allowed = perm is not None or user.is_superuser
    write_allowed = perm in ['collaborator', 'owner'] or user.is_superuser
    delete_allowed = perm == 'owner' or user.is_superuser

    # Create objects
    objects = create_objects()

    # Update project permissions
    if perm is not None:
        project = objects.get('project')
        project.update_permissions(**{perm: [user.id]})
        perms_list = get_perms(user, project)
        assert perms_list == [perm]

    # Test viewsets
    for view in VIEWS:
        base, obj_key, post_data, put_data, patch_data, expected_count, perform_delete = (
            view.get('base'),
            view.get('obj_key'),
            view.get('post_data'),
            view.get('put_data'),
            view.get('patch_data'),
            view.get('expected_count', 1),
            view.get('perform_delete', True),
        )
        obj = objects.get(obj_key)

        # list endpoint
        response = client.get(f'{api_root}/{base}/', format='json')
        assert response.status_code == 200
        if not read_allowed:
            assert response.json().get('count') == 0
        else:
            assert response.json().get('count') == expected_count

        # fetch endpoint
        response = client.get(f'{api_root}/{base}/{obj.id}/', format='json')
        if not read_allowed:
            assert response.status_code == 404
        else:
            assert response.status_code == 200
            assert response.json().get('id') == obj.id

        # create endpoint
        if post_data is not None:
            response = client.post(f'{api_root}/{base}/', post_data, format='json')
            assert response.status_code == 201
            for key, value in post_data.items():
                assert response.json().get(key) == value

        # overwrite endpoint
        if put_data is not None:
            response = client.put(f'{api_root}/{base}/{obj.id}/', put_data, format='json')
            if not read_allowed:
                assert response.status_code == 404
            elif not write_allowed:
                assert response.status_code == 403
            else:
                assert response.status_code == 200
                for key, value in put_data.items():
                    assert response.json().get(key) == value

        # update endpoint
        if patch_data is not None:
            response = client.patch(f'{api_root}/{base}/{obj.id}/', patch_data, format='json')
            if not read_allowed:
                assert response.status_code == 404
            elif not write_allowed:
                assert response.status_code == 403
            else:
                assert response.status_code == 200
                for key, value in patch_data.items():
                    assert response.json().get(key) == value

        # delete endpoint
        if perform_delete:
            response = client.delete(f'{api_root}/{base}/{obj.id}/', format='json')
            if not read_allowed:
                assert response.status_code == 404
            elif not delete_allowed:
                assert response.status_code == 403
            else:
                assert response.status_code == 204

    client.logout()
