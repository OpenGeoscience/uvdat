from django.db import models
from django_extensions.db.models import TimeStampedModel
from s3_file_field import S3FileField

from .chart import Chart
from .dataset import Dataset


class FileItem(TimeStampedModel):
    name = models.CharField(max_length=50)
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE, related_name='source_files', null=True
    )
    chart = models.ForeignKey(Chart, on_delete=models.CASCADE, null=True)
    file = S3FileField()
    file_type = models.CharField(max_length=25)
    file_size = models.IntegerField(null=True)
    metadata = models.JSONField(blank=True, null=True)
    index = models.IntegerField(null=True)

    def is_in_project(self, project_id):
        return self.dataset.is_in_project(project_id)

    def readable_by(self, user):
        return self.dataset.readable_by(user)

    def editable_by(self, user):
        return self.dataset.editable_by(user)

    def deletable_by(self, user):
        return self.dataset.deletable_by(user)

    def download(self):
        # TODO: download
        pass
