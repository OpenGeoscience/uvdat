from django.db.models import Model
from django.db.models.query import QuerySet
from guardian.shortcuts import get_objects_for_user
from rest_framework.filters import BaseFilterBackend
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated

from uvdat.core import models
from uvdat.core.models.project import Project


# TODO: Dataset permissions should be separated from Project permissions
def filter_queryset_by_projects(queryset: QuerySet[Model], projects: QuerySet[models.Project]):
    model = queryset.model
    if model == models.Project:
        return queryset.filter(id__in=projects.values_list('id', flat=True))
    if model in [models.Dataset, models.Chart, models.DerivedRegion, models.SimulationResult]:
        return queryset.filter(project__in=projects)
    if model in [
        models.FileItem,
        models.RasterMapLayer,
        models.VectorMapLayer,
        models.Network,
        models.SourceRegion,
    ]:
        return queryset.filter(dataset__project__in=projects)
    if model in [models.NetworkNode, models.NetworkEdge]:
        return queryset.filter(network__dataset__project__in=projects)

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

        # Get all projects user has access to
        user_projects = get_objects_for_user(
            klass=models.Project, user=request.user, perms=perms, any_perm=True
        )

        # If the object remains in the queryset after this function filters it, then the user has
        # the required permission on at least one associated project
        return filter_queryset_by_projects(queryset=queryset, projects=user_projects).exists()


class GuardianFilter(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        project_id = request.query_params.get('project')
        if project_id is not None:
            try:
                project_id = int(project_id)
            except ValueError:
                project_id = None

        if request.user.is_superuser and project_id is None:
            return queryset

        # Allow user to have any level of permission
        all_perms = [x for x, _ in Project._meta.permissions]
        user_projects = get_objects_for_user(
            klass=(
                models.Project
                if project_id is None
                else models.Project.objects.filter(id=project_id)
            ),
            user=request.user,
            perms=all_perms,
            any_perm=True,
        )

        # Return queryset filtered by objects that are within these projects
        return filter_queryset_by_projects(queryset=queryset, projects=user_projects)
