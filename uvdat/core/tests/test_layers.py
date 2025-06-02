from jsonschema.exceptions import ValidationError
import pytest

from uvdat.core.models import Layer, LayerStyle, Project


@pytest.mark.django_db
def test_layer_style_multiple_defaults(layer: Layer, project: Project):
    style_1 = LayerStyle.objects.create(
        project=project, layer=layer, name='Style 1', is_default=True, style_spec={}
    )
    LayerStyle.objects.create(
        project=project, layer=layer, name='Style 2', is_default=True, style_spec={}
    )
    style_1.refresh_from_db()
    assert not style_1.is_default


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
        'colors': {
            'valid': [{'name': 'polygons', 'single_color': '#ffffff'}],
            'invalid': [
                ([], 'should be non-empty'),
                ([{}], r'\'name\' is a required property'),
                ([{'name': 'polygons', 'single_color': 0}], r'0 is not of type \'string\''),
                ([{'name': 'polygons', 'colormap': {}}], r'\'name\' is a required property'),
                (
                    [{'name': 'polygons', 'colormap': {'name': 'viridis'}}],
                    r'\'discrete\' is a required property',
                ),
                (
                    [{'name': 'polygons', 'colormap': {'name': 'viridis', 'discrete': False}}],
                    r'\'color_by\' is a required property',
                ),
                (
                    [
                        {
                            'name': 'polygons',
                            'colormap': {'name': 'viridis', 'discrete': False, 'color_by': 'depth'},
                        }
                    ],
                    r'\'null_color\' is a required property',
                ),
                (
                    [
                        {
                            'name': 'polygons',
                            'colormap': {
                                'name': 'viridis',
                                'discrete': False,
                                'color_by': 'depth',
                                'null_color': '#000000',
                            },
                        }
                    ],
                    r'\'markers\' is a required property',
                ),
                (
                    [
                        {
                            'name': 'polygons',
                            'colormap': {
                                'name': 'viridis',
                                'discrete': False,
                                'color_by': 'depth',
                                'null_color': '#000000',
                                'markers': [{'color': '#ffffff', 'value': 0}],
                            },
                        }
                    ],
                    r'\'minItems\': 2',
                ),
                (
                    [
                        {
                            'name': 'polygons',
                            'colormap': {
                                'name': 'viridis',
                                'discrete': False,
                                'color_by': 'depth',
                                'null_color': '#000000',
                                'markers': [
                                    {'color': '#ffffff', 'value': 0},
                                    {'color': '#ffffff', 'value': -1},
                                ],
                            },
                        }
                    ],
                    '-1 is less than the minimum of 0',
                ),
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
                project=project, layer=layer, name='Style 1', is_default=True, style_spec=style
            )

        # test invalid values
        for invalid, msg in value['invalid']:
            style = {k: v['valid'] if k != key else invalid for k, v in test_values.items()}
            with pytest.raises(ValidationError, match=msg):
                LayerStyle.objects.create(
                    project=project, layer=layer, name='Style 1', is_default=True, style_spec=style
                )

    style = {k: v['valid'] for k, v in test_values.items()}
    # test all valid
    LayerStyle.objects.create(
        project=project, layer=layer, name='Style 1', is_default=True, style_spec=style
    )
