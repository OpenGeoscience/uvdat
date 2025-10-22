from django.contrib.gis.geos import Point
from django.core.management import call_command
import pytest

from geoinsight.core.models import Dataset, Network, Project


@pytest.mark.slow
@pytest.mark.django_db
def test_load_roads():
    project = Project.objects.create(
        name='Road Test', default_map_zoom=10, default_map_center=Point(42, -71)
    )

    call_command(
        'load_roads',
        'Clifton Park',
        project_id=project.id,
    )

    dataset = Dataset.objects.get(name='Clifton Park Road Network')
    assert dataset is not None
    networks = Network.objects.filter(vector_data__dataset=dataset)
    assert networks.count() == 1
    # check if nodes and edges surpass a minimum amount
    # (exact amounts are expected to change over time)
    assert networks.first().nodes.count() > 1000
    assert networks.first().edges.count() > 2000
