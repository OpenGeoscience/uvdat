import json

from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, Point
from django.core.management.base import BaseCommand, CommandError
from django.utils.timezone import now

from uvdat.core.models import Chart, Dataset, Layer, LayerFrame, Project, VectorData, VectorFeature


class Command(BaseCommand):
    requires_migrations_checks = True

    def handle(self, *args, **kwargs):
        try:
            user = User.objects.get(is_superuser=True)
        except User.DoesNotExist:
            raise CommandError('No superuser exists.')

        Project.objects.filter(name='Metadata Test').delete()
        Dataset.objects.filter(name='Test Dataset').delete()
        print('Removed any previously created Test objects.')

        project = Project.objects.create(
            name='Metadata Test',
            default_map_center=Point(42.4, -71.1),
            default_map_zoom=11,
        )
        project.set_owner(user)
        print('Created Test Project with example objects.')

        dataset = Dataset.objects.create(
            name='Test Dataset',
            description='Dataset contains example metadata.',
            category='test',
            metadata=dict(
                attribution=dict(
                    name='Kitware, Inc.',
                    link='https://www.kitware.com/',
                ),
                license=(
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, '
                    'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '
                    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris '
                    'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in '
                    'reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla '
                    'pariatur. Excepteur sint occaecat cupidatat non proident, sunt '
                    'in culpa qui officia deserunt mollit anim id est laborum.'
                ),
                contributors=[
                    dict(
                        name='Anne Haley',
                        email='anne.haley@kitware.com',
                        role='owner',
                    ),
                    dict(
                        name='Will Dunklin',
                        email='will.dunklin@kitware.com',
                        role='collaborator',
                    ),
                ],
                datetime_created='2025-03-24 10:53 AM',
                datetime_published=str(now()),
                creation_parameters=dict(
                    downscaling=dict(
                        climate_model=dict(
                            name='CESM2-LENS',
                            ensemble_member='r1i1p1f1',
                            emissions_scenario=370,
                        ),
                        method='LOCA (Localized Constructed Analogs) to daily 1/16 degree',
                        time_period=[2080, 2100],
                        return_period='100 years',
                    ),
                    flood_modeling=dict(
                        precipitation=dict(
                            hyetograph=dict(
                                name='Type 2',
                                model='NCRS Type II',
                            ),
                            spatially_uniform=True,
                            dem_resolution=dict(
                                label='1/3 arcsecond = 10 m',
                                meters=10,
                                arcseconds=1 / 3,
                            ),
                        )
                    ),
                ),
                layers=[
                    dict(
                        name='Test Layer',
                        frames=[
                            dict(
                                name='Test Frame 1',
                                index=0,
                                features=[dict(name='2024 Feature 1')],
                            ),
                            dict(
                                name='Test Frame 2',
                                index=1,
                                features=[dict(name='2025 Feature 1')],
                            ),
                        ],
                    )
                ],
            ),
        )
        project.datasets.add(dataset)
        print('Created Test Dataset with example metadata.')

        layer = Layer.objects.create(
            name='Test Layer',
            dataset=dataset,
            metadata=dict(
                dataset_id=dataset.id,
                description=(
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, '
                    'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '
                    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris '
                    'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in '
                    'reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla '
                    'pariatur. Excepteur sint occaecat cupidatat non proident, sunt '
                    'in culpa qui officia deserunt mollit anim id est laborum.'
                ),
                created=str(now()),
                frames=[
                    dict(
                        name='Test Frame 1',
                        index=0,
                        features=[dict(name='2024 Feature 1')],
                    ),
                    dict(
                        name='Test Frame 2',
                        index=1,
                        features=[dict(name='2025 Feature 1')],
                    ),
                ],
                property_values=[
                    dict(
                        key='year',
                        values=[2020, 2021, 2022, 2023, 2024, 2025],
                    ),
                    dict(
                        key='depth',
                        values=[
                            1.2,
                            2.3,
                            3.4,
                            4.5,
                            5.6,
                            6.7,
                            7.8,
                            8.9,
                            9.0,
                            12.34,
                            23.45,
                            34.56,
                            45.67,
                            56.78,
                            67.89,
                            78.90,
                            123.45,
                            234.56,
                            345.67,
                            456.78,
                            567.89,
                            678.90,
                            1234.5,
                            2345.6,
                            3456.7,
                            4567.8,
                            5678.9,
                            6789.0,
                        ],
                    ),
                    dict(
                        key='type',
                        values=['water', 'land', 'air', 'building', 'vegetation', 'other'],
                    ),
                ],
            ),
        )
        print('Created Test Layer with example metadata.')

        vector_1 = VectorData.objects.create(
            name='Test Vector 1',
            dataset=dataset,
        )
        VectorFeature.objects.create(
            vector_data=vector_1,
            geometry=GEOSGeometry(json.dumps(dict(type='Point', coordinates=[-71.1, 42.4]))),
            properties=dict(
                label='Test Feature 1',
                location=dict(
                    lat=-71.1,
                    lon=42.4,
                ),
                year=2024,
            ),
        )
        LayerFrame.objects.create(
            name='Test Frame 1',
            layer=layer,
            vector=vector_1,
            index=0,
            metadata=dict(
                label='2024 Features',
                features=[dict(name='2024 Feature 1')],
                created=str(now()),
            ),
        )

        vector_2 = VectorData.objects.create(
            name='Test Vector 2',
            dataset=dataset,
        )
        VectorFeature.objects.create(
            vector_data=vector_2,
            geometry=GEOSGeometry(json.dumps(dict(type='Point', coordinates=[-71.15, 42.45]))),
            properties=dict(
                label='Test Feature 2',
                location=dict(
                    lat=-71.15,
                    lon=42.45,
                ),
                year=2025,
            ),
        )
        LayerFrame.objects.create(
            name='Test Frame 2',
            layer=layer,
            vector=vector_2,
            index=1,
            metadata=dict(
                label='2025 Features',
                features=[dict(name='2025 Feature 1')],
                created=str(now()),
            ),
        )
        print('Created 2 Test LayerFrames with example metadata.')

        data = dict(
            labels=[
                0,
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12,
                13,
                14,
                15,
                16,
                17,
                18,
                19,
                20,
                21,
                22,
                23,
            ],
            datasets=[
                dict(
                    data=[
                        0.0,
                        0.1173697917,
                        0.4694791667,
                        1.056328125,
                        1.877916667,
                        2.934244792,
                        4.2253125,
                        5.751119792,
                        7.511666667,
                        9.506953125,
                        11.73697917,
                        14.20174479,
                        16.90125,
                        14.20174479,
                        11.73697917,
                        9.506953125,
                        7.511666667,
                        5.751119792,
                        4.2253125,
                        2.934244792,
                        1.877916667,
                        1.056328125,
                        0.4694791667,
                        0.1173697917,
                    ],
                    label='precipitation',
                    borderColor='#0000ff',
                    backgroundColor='#0000ff',
                )
            ],
        )
        options = dict(
            x_title='Hour',
            y_title='Precipitation rate (mm/hr)',
            chart_title='Rainfall Intensity over 24 hours',
        )
        Chart.objects.create(
            name='Test Chart',
            description='A basic line chart with example metadata.',
            project=project,
            metadata=dict(
                created=str(now()),
                data=data,
                options=options,
            ),
            chart_data=data,
            chart_options=options,
        )
        print('Created Test Chart with example metadata.')
