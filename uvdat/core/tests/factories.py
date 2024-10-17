from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
import factory.django
from factory.faker import faker
import factory.fuzzy

from uvdat.core.models import Dataset, Project


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
