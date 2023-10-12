from django.db import models

from .city import City


class Chart(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='charts')
    metadata = models.JSONField(blank=True, null=True)

    chart_data = models.JSONField(blank=True, null=True)
    chart_options = models.JSONField(blank=True, null=True)
    editable = models.BooleanField(default=False)

    def new_line(self):
        # TODO: new line
        pass

    def rename_lines(self, new_names):
        # TODO: rename lines
        pass

    def clear(self):
        # TODO: clear
        pass
