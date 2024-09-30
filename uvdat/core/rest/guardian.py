from guardian.shortcuts import get_objects_for_user
from rest_framework.filters import BaseFilterBackend
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated

from uvdat.core import models


# TODO: Dataset permissions should be separated from Project permissions
def filter_by_parent_perms(
    klass, user, perms=['follower', 'collaborator', 'owner'], queryset=None, obj=None
):
    objects = None
    if queryset is not None:
        objects = queryset
    elif obj is not None:
        objects = klass.objects.filter(id=obj.id)

    parent_queryset = None
    filter_function = None
    if klass == models.Project:
        parent_queryset = objects
        filter_function = lambda parents: parents
    elif klass == models.Chart:
        parent_queryset = models.Project.objects.filter(charts__in=objects).distinct()
        filter_function = lambda parents: objects.filter(project__in=parents).distinct()
    elif klass == models.Dataset:
        parent_queryset = models.Project.objects.filter(datasets__in=objects).distinct()
        filter_function = lambda parents: objects.filter(project__in=parents).distinct()
    elif klass == models.FileItem:
        parent_queryset = models.Project.objects.filter(
            datasets__source_files__in=objects
        ).distinct()
        filter_function = lambda parents: objects.filter(dataset__project__in=parents).distinct()
    elif klass == models.RasterMapLayer:
        parent_queryset = models.Project.objects.filter(
            datasets__rastermaplayer__in=objects
        ).distinct()
        filter_function = lambda parents: objects.filter(dataset__project__in=parents).distinct()
    elif klass == models.VectorMapLayer:
        parent_queryset = models.Project.objects.filter(
            datasets__vectormaplayer__in=objects
        ).distinct()
        filter_function = lambda parents: objects.filter(dataset__project__in=parents).distinct()
    # TODO: Add clause for VectorFeature when an API Viewset is added for that model
    elif klass == models.SourceRegion:
        parent_queryset = models.Project.objects.filter(datasets__regions__in=objects).distinct()
        filter_function = lambda parents: objects.filter(dataset__project__in=parents).distinct()
    elif klass == models.DerivedRegion:
        parent_queryset = models.Project.objects.filter(derived_regions__in=objects).distinct()
        filter_function = lambda parents: objects.filter(project__in=parents).distinct()
    elif klass == models.Network:
        parent_queryset = models.Project.objects.filter(datasets__networks__in=objects).distinct()
        filter_function = lambda parents: objects.filter(dataset__project__in=parents).distinct()
    elif klass == models.NetworkEdge:
        parent_queryset = models.Project.objects.filter(
            datasets__networks__edges__in=objects
        ).distinct()
        filter_function = lambda parents: objects.filter(
            network__dataset__project__in=parents
        ).distinct()
    elif klass == models.NetworkNode:
        parent_queryset = models.Project.objects.filter(
            datasets__networks__nodes__in=objects
        ).distinct()
        filter_function = lambda parents: objects.filter(
            network__dataset__project__in=parents
        ).distinct()

    if parent_queryset is not None and filter_function is not None:
        allowed_parents = get_objects_for_user(
            klass=parent_queryset,
            user=user,
            perms=perms,
            any_perm=True,
        )
        allowed_children = filter_function(allowed_parents)
        return allowed_children
    return klass.objects.none()


class GuardianPermission(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        perms = ['follower', 'collaborator', 'owner']
        if request.method not in SAFE_METHODS:
            perms = ['collaborator', 'owner']
        if request.method == 'DELETE':
            perms = ['owner']
        allowed_objects = filter_by_parent_perms(obj.__class__, request.user, perms=perms, obj=obj)
        return allowed_objects.filter(id=obj.id).exists()


class GuardianFilter(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        if request.user.is_superuser:
            return queryset
        return filter_by_parent_perms(queryset.model, request.user, queryset=queryset)
