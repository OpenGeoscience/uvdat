from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from jsonschema import validate

from .layer import LayerStyle
from .project import Project

MARKER_SCHEMA = dict(
    type='array',
    items=dict(
        type='object',
        properties=dict(
            color=dict(
                type='string',
            ),
            value=dict(
                type='number',
                minimum=0,
                maximum=1,
            ),
        ),
        required=['color', 'value'],
    ),
    minItems=2,
    uniqueItems=True,
)


class Colormap(models.Model):
    name = models.CharField(max_length=255)
    markers = models.JSONField(default=list)
    project = models.ForeignKey(
        Project,
        related_name='colormaps',
        on_delete=models.CASCADE,
        null=True,
    )

    def clean(self):
        if len(self.markers):
            validate(instance=self.markers, schema=MARKER_SCHEMA)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ColormapConfig(models.Model):
    colormap = models.ForeignKey(
        Colormap,
        related_name='colormap_configs',
        null=True,
        on_delete=models.SET_DEFAULT,
        default=1,
    )
    color_by = models.CharField(max_length=255)  # contains property name
    null_color = models.CharField(max_length=7)  # contains a color hex
    discrete = models.BooleanField(default=False)
    n_colors = models.IntegerField(
        null=True, validators=[MinValueValidator(2), MaxValueValidator(30)]
    )
    range_minimum = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    range_maximum = models.DecimalField(max_digits=10, decimal_places=2, null=True)


class ColorConfig(models.Model):
    style = models.ForeignKey(LayerStyle, related_name='color_configs', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    visible = models.BooleanField(default=True)
    single_color = models.CharField(max_length=7, null=True)  # optionally contains a color hex
    colormap = models.ForeignKey(
        ColormapConfig, related_name='color_configs', null=True, on_delete=models.SET_NULL
    )
