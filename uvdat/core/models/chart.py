from django.db import models

from .context import Context


class Chart(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    context = models.ForeignKey(Context, on_delete=models.CASCADE, related_name='charts')
    metadata = models.JSONField(blank=True, null=True)

    chart_data = models.JSONField(blank=True, null=True)
    chart_options = models.JSONField(blank=True, null=True)
    editable = models.BooleanField(default=False)

    def is_in_context(self, context_id):
        return self.context.id == context_id

    def spawn_conversion_task(
        self,
        conversion_options=None,
        asynchronous=True,
    ):
        from uvdat.core.tasks.chart import convert_chart

        if asynchronous:
            convert_chart.delay(self.id, conversion_options)
        else:
            convert_chart(self.id, conversion_options)

    def new_line(self):
        # TODO: new line
        pass

    def rename_lines(self, new_names):
        # TODO: rename lines
        pass

    def clear(self):
        # TODO: clear
        pass
