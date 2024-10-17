import typing

from django.contrib.auth.models import User
from django.contrib.gis.db import models as geo_models
from django.db import models, transaction
from guardian.models import UserObjectPermission
from guardian.shortcuts import assign_perm, get_users_with_perms

from .dataset import Dataset


class Project(models.Model):
    name = models.CharField(max_length=255, unique=True)
    default_map_center = geo_models.PointField()
    default_map_zoom = models.FloatField(default=10)
    datasets = models.ManyToManyField(Dataset, blank=True)

    def owner(self) -> User:
        users = typing.cast(
            list[User], list(get_users_with_perms(self, only_with_perms_in=['owner']))
        )
        if len(users) != 1:
            raise Exception('Project must have exactly one owner')

        return users[0]

    def collaborators(self) -> list[User]:
        return typing.cast(
            list[User], list(get_users_with_perms(self, only_with_perms_in=['collaborator']))
        )

    def followers(self):
        return typing.cast(
            list[User], list(get_users_with_perms(self, only_with_perms_in=['follower']))
        )

    @transaction.atomic()
    def set_owner(self, user: User):
        UserObjectPermission.objects.filter(
            content_type__app_label=self._meta.app_label,
            content_type__model=self._meta.model_name,
            object_pk=self.pk,
            permission__codename='owner',
        ).delete()

        assign_perm('owner', user, self)

    @transaction.atomic()
    def add_collaborators(self, users: list[User]):
        for user in users:
            assign_perm('collaborator', user, self)

    @transaction.atomic()
    def add_followers(self, users: list[User]):
        for user in users:
            assign_perm('follower', user, self)

    @transaction.atomic()
    def set_permissions(
        self,
        owner: User,
        collaborator: list[User] | None = None,
        follower: list[User] | None = None,
    ):
        # Delete all existing first
        UserObjectPermission.objects.filter(
            content_type__app_label=self._meta.app_label,
            content_type__model=self._meta.model_name,
            object_pk=self.pk,
        ).delete()

        # Assign new perms
        self.set_owner(owner)
        self.add_collaborators(collaborator or [])
        self.add_followers(follower or [])

    class Meta:
        permissions = [
            ('owner', 'Can read, write, and delete'),
            ('collaborator', 'Can read and write'),
            ('follower', 'Can read'),
        ]
