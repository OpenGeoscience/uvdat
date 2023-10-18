from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions, routers

from uvdat.core.rest import (
    ChartViewSet,
    ContextViewSet,
    DatasetViewSet,
    DerivedRegionViewSet,
    OriginalRegionViewSet,
    RasterMapLayerViewSet,
    SimulationViewSet,
    VectorMapLayerViewSet,
)

router = routers.SimpleRouter()
# OpenAPI generation
schema_view = get_schema_view(
    openapi.Info(title='UVDAT', default_version='v1', description=''),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

router.register(r'contexts', ContextViewSet, basename='contexts')
router.register(r'datasets', DatasetViewSet, basename='datasets')
router.register(r'charts', ChartViewSet, basename='charts')
router.register(r'rasters', RasterMapLayerViewSet, basename='rasters')
router.register(r'vectors', VectorMapLayerViewSet, basename='vectors')
router.register(r'original-regions', OriginalRegionViewSet, basename='original-regions')
router.register(r'derived-regions', DerivedRegionViewSet, basename='derived-regions')
router.register(r'simulations', SimulationViewSet, basename='simulations')

urlpatterns = [
    path('accounts/', include('allauth.urls')),
    path('oauth/', include('oauth2_provider.urls')),
    path('admin/', admin.site.urls),
    path('api/v1/s3-upload/', include('s3_file_field.urls')),
    path('api/v1/', include(router.urls)),
    path('api/docs/redoc/', schema_view.with_ui('redoc'), name='docs-redoc'),
    path('api/docs/swagger/', schema_view.with_ui('swagger'), name='docs-swagger'),
]

if settings.DEBUG:
    import debug_toolbar

    urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
