from django.core.management import call_command
import pytest

from uvdat.core.models import (
    Chart,
    Context,
    Dataset,
    DerivedRegion,
    FileItem,
    NetworkEdge,
    NetworkNode,
    RasterMapLayer,
    SimulationResult,
    SourceRegion,
    VectorFeature,
    VectorMapLayer,
)


@pytest.mark.django_db
def test_populate():
    # smaller subset for faster evaluation
    # 0 is MBTA Rapid Transit, tests network eval
    # 4 is Massachusetts Elevation Data, tests raster eval
    # 5 is Boston Neighborhoods, tests regions eval
    # 8 is Boston Sea Level Rises, tests multi-map-layer dataset eval
    dataset_indexes = [0, 4, 5, 8]

    call_command(
        'populate',
        include_large=True,
        dataset_indexes=dataset_indexes,
    )

    assert Chart.objects.all().count() == 1
    assert Context.objects.all().count() == 3
    assert Dataset.objects.all().count() == 4
    assert DerivedRegion.objects.all().count() == 0
    assert FileItem.objects.all().count() == 7
    assert NetworkEdge.objects.all().count() == 164
    assert NetworkNode.objects.all().count() == 158
    assert RasterMapLayer.objects.all().count() == 1
    assert SimulationResult.objects.all().count() == 0
    assert SourceRegion.objects.all().count() == 24
    assert VectorMapLayer.objects.all().count() == 5
    assert VectorFeature.objects.count() == 351
