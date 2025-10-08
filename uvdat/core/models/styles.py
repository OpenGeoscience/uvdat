from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from uvdat.core.models import Colormap, Layer, Project


class LayerStyle(models.Model):
    name = models.CharField(max_length=255, default='Layer Style')
    layer = models.ForeignKey(Layer, related_name='styles', on_delete=models.CASCADE)
    project = models.ForeignKey(Project, related_name='styles', on_delete=models.CASCADE)
    default_frame = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    opacity = models.DecimalField(
        default=1,
        max_digits=2,
        decimal_places=1,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(1),
        ],
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'layer', 'project'], name='unique_name_layer_project'
            )
        ]


class ColorConfig(models.Model):
    style = models.ForeignKey(LayerStyle, related_name='color_configs', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    visible = models.BooleanField(default=True)
    single_color = models.CharField(
        max_length=12, null=True
    )  # optionally contains a color hex or 'transparent'


class ColormapConfig(models.Model):
    color_config = models.OneToOneField(
        ColorConfig,
        related_name='colormap',
        on_delete=models.CASCADE,
    )
    colormap = models.ForeignKey(
        Colormap,
        related_name='colormap_configs',
        null=True,
        on_delete=models.SET_NULL,
    )
    color_by = models.CharField(max_length=255)  # contains property name
    null_color = models.CharField(max_length=12)  # contains a color hex or 'transparent'
    clamp = models.BooleanField(default=False)
    discrete = models.BooleanField(default=False)
    n_colors = models.IntegerField(
        null=True, validators=[MinValueValidator(2), MaxValueValidator(30)]
    )
    range_minimum = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    range_maximum = models.DecimalField(max_digits=10, decimal_places=2, null=True)


class SizeConfig(models.Model):
    style = models.ForeignKey(LayerStyle, related_name='size_configs', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    zoom_scaling = models.BooleanField(default=True)
    single_size = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        null=True,
    )


class SizeRangeConfig(models.Model):
    size_config = models.OneToOneField(
        SizeConfig,
        related_name='size_range',
        on_delete=models.CASCADE,
    )
    size_by = models.CharField(max_length=255)  # contains property name
    minimum = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1)],
    )
    maximum = models.IntegerField(
        default=6,
        validators=[MinValueValidator(1)],
    )
    null_size = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        null=True,
    )
    null_transparent = models.BooleanField(default=True)


class FilterConfig(models.Model):
    style = models.ForeignKey(LayerStyle, related_name='filter_configs', on_delete=models.CASCADE)
    filter_by = models.CharField(max_length=255)  # contains property name
    include = models.BooleanField(default=True)
    transparency = models.BooleanField(default=True)
    range_minimum = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    range_maximum = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    values_list = models.JSONField(null=True)
