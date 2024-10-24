from pathlib import Path

from django.contrib.auth.models import User
from django.contrib.gis.geos import LineString, Point
import factory.django
from factory.faker import faker
import factory.fuzzy

from uvdat.core.models import Dataset, Project
from uvdat.core.models.map_layers import RasterMapLayer, VectorMapLayer
from uvdat.core.models.networks import Network, NetworkEdge, NetworkNode


class FuzzyPointField(factory.fuzzy.BaseFuzzyAttribute):
    """Yields random point"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def fuzz(self):
        fake = faker.Faker()
        return Point((fake.latitude(), fake.longitude()))


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.SelfAttribute('email')
    email = factory.Faker('safe_email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')


class SuperUserFactory(UserFactory):
    class Meta:
        model = User

    username = factory.SelfAttribute('email')
    email = factory.Faker('safe_email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_superuser = True


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project

    name = factory.Faker('name')
    default_map_center = FuzzyPointField()
    default_map_zoom = factory.Faker('pyfloat', min_value=0, max_value=22)


class DatasetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Dataset

    name = factory.Faker('name')
    dataset_type = Dataset.DatasetType.VECTOR
    category = factory.Faker(
        'random_element',
        elements=[
            'climate',
            'elevation',
            'region',
            'flood',
            'transportation',
            'energy',
        ],
    )


class NetworkFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Network

    dataset = factory.SubFactory(DatasetFactory)


class NetworkNodeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = NetworkNode

    name = factory.Faker('name')
    network = factory.SubFactory(NetworkFactory)
    location = FuzzyPointField()


class NetworkEdgeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = NetworkEdge

    name = factory.Faker('name')
    network = factory.SubFactory(NetworkFactory)

    # TODO: Fix bug where both of these fields point to the same node
    # Ensure the edge and both nodes are in the same network
    from_node = factory.SubFactory(NetworkNodeFactory, network=factory.SelfAttribute('..network'))
    to_node = factory.SubFactory(NetworkNodeFactory, network=factory.SelfAttribute('..network'))

    @factory.lazy_attribute
    def line_geometry(self):
        return LineString(self.from_node.location, self.to_node.location)


class RasterMapLayerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RasterMapLayer

    dataset = factory.SubFactory(DatasetFactory)
    cloud_optimized_geotiff = factory.django.FileField(
        filename=factory.Faker('file_name', extension='tif'),
        from_path=Path(__file__).parent / 'data' / 'sample_cog.tif',
    )


class VectorMapLayerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = VectorMapLayer

    dataset = factory.SubFactory(DatasetFactory)
    geojson_file = factory.django.FileField(
        filename=factory.Faker('file_name', extension='json'),
        from_path=Path(__file__).parent / 'data' / 'sample_geo.json',
    )
