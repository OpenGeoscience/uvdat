from django.db import models
from django.utils import timezone

from .project import Project


class AnalysisResult(models.Model):
    name = models.CharField(max_length=255)
    analysis_type = models.CharField(max_length=25)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='analysis_results')
    inputs = models.JSONField(blank=True, null=True)
    outputs = models.JSONField(blank=True, null=True)
    status = models.TextField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    completed = models.DateTimeField(null=True)

    def write_error(self, err):
        if self.error is None:
            self.error = ''
        else:
            self.error += ', '
        self.error += err
        self.save()

    def write_status(self, stat):
        self.status = stat
        self.save()

    def complete(self):
        self.completed = timezone.now()
        seconds = (self.completed - self.created).total_seconds()
        self.status = 'Completed in %.2f seconds.' % seconds
        self.save()
