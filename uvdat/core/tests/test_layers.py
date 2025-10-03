from jsonschema.exceptions import ValidationError
import pytest

from uvdat.core.models import ColorConfig, Layer, LayerStyle, Project


@pytest.mark.django_db
def test_layer_style_validation(layer: Layer, project: Project):
    test_values = {
        'default_frame': {
            'valid': 0,
            'invalid': [
                (-1, '-1 is less than the minimum of 0'),
                (False, r'False is not of type \'integer\''),
            ],
        },
        'opacity': {
            'valid': 1,
            'invalid': [
                (-1, '-1 is less than the minimum of 0'),
                (2, '2 is greater than the maximum of 1'),
            ],
        },
        'sizes': {
            'valid': [{'name': 'polygons', 'single_size': 5, 'zoom_scaling': False}],
            'invalid': [
                ([], 'should be non-empty'),
                ([{'zoom_scaling': False}], r'\'name\' is a required property'),
                (
                    [
                        {
                            'zoom_scaling': False,
                            'name': 'polygons',
                            'size_range': {'size_by': 'depth', 'minimum': 0},
                        }
                    ],
                    r'\'maximum\' is a required property',
                ),
                (
                    [
                        {
                            'zoom_scaling': False,
                            'name': 'polygons',
                            'size_range': {'size_by': 'depth', 'minimum': 0, 'maximum': -1},
                        }
                    ],
                    r'\'null_size\' is a required property',
                ),
                (
                    [
                        {
                            'zoom_scaling': False,
                            'name': 'polygons',
                            'size_range': {
                                'size_by': 'depth',
                                'minimum': 0,
                                'maximum': -1,
                                'null_size': {'transparency': False, 'size': 5},
                            },
                        }
                    ],
                    '-1 is less than the minimum of 0',
                ),
            ],
        },
        'filters': {
            'valid': [],
            'invalid': [
                ([{}], r'\'filter_by\' is a required property'),
                ([{'filter_by': 'depth'}], r'\'include\' is a required property'),
                (
                    [{'filter_by': 'depth', 'include': True}],
                    r'\'transparency\' is a required property',
                ),
                (
                    [{'filter_by': 'depth', 'include': True, 'transparency': True, 'range': []}],
                    r'\'minItems\': 2',
                ),
                (
                    [{'filter_by': 'depth', 'include': True, 'transparency': True, 'list': []}],
                    r'\'minItems\': 1',
                ),
            ],
        },
    }
    for key, value in test_values.items():
        # test missing key
        style = {k: v['valid'] for k, v in test_values.items() if k != key}
        msg = rf'\'{key}\' is a required property'
        with pytest.raises(ValidationError, match=msg):
            LayerStyle.objects.create(
                project=project, layer=layer, name='Style 1', style_spec=style
            )

        # test invalid values
        for invalid, msg in value['invalid']:
            style = {k: v['valid'] if k != key else invalid for k, v in test_values.items()}
            with pytest.raises(ValidationError, match=msg):
                LayerStyle.objects.create(
                    project=project, layer=layer, name='Style 1', style_spec=style
                )

    style = {k: v['valid'] for k, v in test_values.items()}
    # test all valid
    LayerStyle.objects.create(project=project, layer=layer, name='Style 1', style_spec=style)


@pytest.mark.django_db
def test_layer_style_color_config(layer: Layer, project: Project, user, authenticated_api_client):
    project.set_collaborators([user])
    project.datasets.set([layer.dataset])

    style_spec = {
        'default_frame': 0,
        'opacity': 1,
        'sizes': [{'name': 'polygons', 'single_size': 5, 'zoom_scaling': False}],
        'filters': [],
        'colors': [
            {'name': 'polygons', 'visible': True, 'single_color': '#ffffff', 'colormap': None},
            {
                'name': 'lines',
                'visible': True,
                'single_color': None,
                'colormap': {
                    'id': 1,
                    'discrete': True,
                    'n_colors': 5,
                    'color_by': 'depth',
                    'null_color': '#000000',
                    'range': [20.0, 50.0],
                },
            },
        ],
    }
    layer_style = LayerStyle.objects.create(
        project=project, layer=layer, name='Style 1', style_spec=style_spec.copy()
    )
    color_configs = list(ColorConfig.objects.filter(style=layer_style))
    assert len(color_configs) == 2
    assert color_configs[0].name == 'polygons'
    assert color_configs[0].visible
    assert color_configs[0].single_color == '#ffffff'
    assert color_configs[0].colormap is None
    assert color_configs[1].name == 'lines'
    assert color_configs[1].visible
    assert color_configs[1].single_color is None
    assert color_configs[1].colormap is not None
    assert color_configs[1].colormap.discrete
    assert color_configs[1].colormap.n_colors == 5
    assert color_configs[1].colormap.color_by == 'depth'
    assert color_configs[1].colormap.null_color == '#000000'
    assert color_configs[1].colormap.range_minimum == 20
    assert color_configs[1].colormap.range_maximum == 50
    assert color_configs[1].colormap.colormap is not None
    assert color_configs[1].colormap.colormap.name == 'terrain'

    # Ensure that serialized style_spec is the same as the initial spec
    serialized = authenticated_api_client.get(f'/api/v1/layer-styles/{layer_style.id}/').json()
    assert serialized.get('style_spec') == style_spec

    # Edit style spec
    style_spec['colors'] = [
        {
            'name': 'polygons',
            'visible': True,
            'single_color': None,
            'colormap': {
                'id': 2,
                'discrete': False,
                'n_colors': None,
                'color_by': 'area',
                'null_color': '#ff0000',
                'range': [0.5, 2.5],
            },
        },
        {'name': 'lines', 'visible': True, 'single_color': '#0000ff', 'colormap': None},
    ]
    layer_style.style_spec = style_spec.copy()
    layer_style.save()
    new_color_configs = list(ColorConfig.objects.filter(style=layer_style))
    assert len(color_configs) == 2
    # Ensure that same objects are modified
    assert [c.id for c in new_color_configs] == [c.id for c in color_configs]
    assert new_color_configs[0].single_color is None
    assert new_color_configs[0].colormap is not None
    assert not new_color_configs[0].colormap.discrete
    assert new_color_configs[0].colormap.n_colors is None
    assert new_color_configs[0].colormap.color_by == 'area'
    assert new_color_configs[0].colormap.null_color == '#ff0000'
    assert new_color_configs[0].colormap.range_minimum == 0.5
    assert new_color_configs[0].colormap.range_maximum == 2.5
    assert new_color_configs[0].colormap.colormap is not None
    assert new_color_configs[0].colormap.colormap.name == 'viridis'
    assert new_color_configs[1].single_color == '#0000ff'
    assert new_color_configs[1].colormap is None

    # Ensure that serialized style_spec is the same as the edited spec
    serialized = authenticated_api_client.get(f'/api/v1/layer-styles/{layer_style.id}/').json()
    assert serialized.get('style_spec') == style_spec
