from guardian.shortcuts import get_objects_for_user
from rest_framework.filters import BaseFilterBackend
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated

from uvdat.core import models


class GuardianPermission(IsAuthenticated):
    def get_object_queryset(self, obj):
        if isinstance(obj, models.Project):
            return obj
        if isinstance(models.Dataset):
            return obj.project_set
        if isinstance(obj, (models.Chart, models.SimulationResult, models.DerivedRegion)):
            return obj.project
        if isinstance(
            obj,
            (
                models.FileItem,
                models.VectorMapLayer,
                models.RasterMapLayer,
                models.Network,
                models.SourceRegion,
            ),
        ):
            return obj.dataset.project_set
        if isinstance(obj, (models.NetworkEdge, models.NetworkNode)):
            return obj.network.dataset.project_set
        if isinstance(obj, models.VectorFeature):
            return obj.map_layer.dataset.project_set

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        perms = ['follower']
        if request.method not in SAFE_METHODS:
            perms.append('collaborator')
        if request.method == 'DELETE':
            perms.append('owner')
        return request.user.has_perm(perms, self.get_object_queryset(obj))


class GuardianFilter(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        if request.user.is_superuser:
            pass
        return get_objects_for_user(
            klass=queryset,
            user=request.user,
            perms=['follower', 'collaborator', 'owner'],
            any_perm=True,
        )
