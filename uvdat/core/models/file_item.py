from django.db import models
from django_extensions.db.models import TimeStampedModel
from s3_file_field import S3FileField

from .dataset import Dataset


class FileItem(TimeStampedModel):
    name = models.CharField(max_length=50)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='original_files')
    file = S3FileField()
    file_type = models.CharField(max_length=25)
    metadata = models.JSONField(blank=True, null=True)

    def download(self):
        # TODO: download
        pass
