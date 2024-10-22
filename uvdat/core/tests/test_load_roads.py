from django.contrib.gis.geos import Point
from django.core.management import call_command
import pytest

from uvdat.core.models import Dataset, Project


@pytest.mark.slow
@pytest.mark.django_db
def test_load_roads():
    project = Project.objects.create(
        name='Road Test', default_map_zoom=10, default_map_center=Point(42, -71)
    )

    call_command(
        'load_roads',
        'Boston',
        project_id=project.id,
    )

    dataset = Dataset.objects.get(name='Boston Road Network')
    assert dataset is not None
    assert dataset.networks.count() == 1
    # check if nodes and edges surpass a minimum amount
    # (exact amounts are expected to change over time)
    assert dataset.networks.first().nodes.count() > 10000
    assert dataset.networks.first().edges.count() > 20000
