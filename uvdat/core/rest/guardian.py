from django.contrib.auth.models import User
from django.db.models import Model
from django.db.models.query import QuerySet
from guardian.shortcuts import get_objects_for_user
from rest_framework.filters import BaseFilterBackend
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated

from uvdat.core import models


# TODO: Dataset permissions should be separated from Project permissions
def filter_queryset_by_project_permission(
    queryset: QuerySet[Model], user: User, perms: list[str] | None = None
):
    if perms is None:
        perms = ['follower', 'collaborator', 'owner']
    # Get all projects a user has access to
    user_projects = get_objects_for_user(
        klass=models.Project, user=user, perms=perms, any_perm=True
    )
    model = queryset.model
    if model == models.Project:
        return queryset.filter(id__in=user_projects.values_list('id', flat=True))
    if model in [models.Dataset, models.Chart, models.DerivedRegion]:
        return queryset.filter(project__in=user_projects)
    if model in [
        models.FileItem,
        models.RasterMapLayer,
        models.VectorMapLayer,
        models.Network,
        models.SourceRegion,
    ]:
        return queryset.filter(dataset__project__in=user_projects)
    if model in [models.NetworkNode, models.NetworkEdge]:
        return queryset.filter(network__dataset__project__in=user_projects)
    # If any models are un-caught, raise an exception
    raise NotImplementedError


class GuardianPermission(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        perms = ['follower', 'collaborator', 'owner']
        if request.method not in SAFE_METHODS:
            perms = ['collaborator', 'owner']
        if request.method == 'DELETE':
            perms = ['owner']
        if not isinstance(obj, Model):
            raise Exception('Only Django models may be used in permission check')
        # Create queryset out of single object, so it can be passed to the filter function
        queryset = obj.__class__.objects.filter(pk=obj.pk)
        # If the object remains in the queryset after this function filters it, then the user has
        # the required permission on at least one associated project
        return filter_queryset_by_project_permission(queryset, request.user, perms).exists()


class GuardianFilter(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        if request.user.is_superuser:
            return queryset
        return filter_queryset_by_project_permission(queryset, request.user)
