from django.contrib.auth.models import User
from django.core.management import call_command
import pytest

from uvdat.core.models import (
    Chart,
    Dataset,
    FileItem,
    Layer,
    LayerFrame,
    Network,
    NetworkEdge,
    NetworkNode,
    Project,
    RasterData,
    SimulationResult,
    SourceRegion,
    VectorData,
    VectorFeature,
)


@pytest.mark.slow
@pytest.mark.django_db
def test_populate():
    # ensure a superuser exists
    User.objects.create_superuser('testsuper')

    # smaller subset for faster evaluation
    # 0 is MBTA Rapid Transit, tests network eval
    # 4 is Massachusetts Elevation Data, tests raster eval
    # 5 is Boston Neighborhoods, tests regions eval
    # 8 is Boston Sea Level Rises, tests multilayer dataset eval
    dataset_indexes = [0, 4, 5, 8]

    call_command(
        'populate',
        'boston_floods',
        include_large=True,
        dataset_indexes=dataset_indexes,
    )

    assert Chart.objects.all().count() == 1
    assert Project.objects.all().count() == 2
    assert Dataset.objects.all().count() == 4
    assert FileItem.objects.all().count() == 7
    # TODO use correct expected counts
    assert Layer.objects.all().count() == -1
    assert LayerFrame.objects.all().count() == -1
    assert Network.objects.all().count() == 1
    assert NetworkEdge.objects.all().count() == 164
    assert NetworkNode.objects.all().count() == 158
    assert RasterData.objects.all().count() == 1
    assert SimulationResult.objects.all().count() == 0
    assert SourceRegion.objects.all().count() == 24
    assert VectorData.objects.all().count() == 5
    assert VectorFeature.objects.count() == 351
