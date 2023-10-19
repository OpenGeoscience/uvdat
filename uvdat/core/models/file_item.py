from django.db import models
from django_extensions.db.models import TimeStampedModel
from s3_file_field import S3FileField

from .dataset import Dataset
from .chart import Chart


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

    def download(self):
        # TODO: download
        pass
