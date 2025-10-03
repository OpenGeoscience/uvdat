import json
from pathlib import Path

from django.db import models
from jsonschema import validate

from .data import RasterData, VectorData
from .dataset import Dataset
from .project import Project

SCHEMA_FILE = Path(__file__).parent / 'layer_style_schema.json'
with open(SCHEMA_FILE) as f:
    LAYER_STYLE_SCHEMA = dict(json.load(f))


def default_source_filters():
    return dict(band=1)


class Layer(models.Model):
    name = models.CharField(max_length=255, default='Layer')
    dataset = models.ForeignKey(Dataset, related_name='layers', on_delete=models.CASCADE)
    metadata = models.JSONField(blank=True, null=True)
    default_style = models.ForeignKey(
        'LayerStyle', null=True, related_name='default_layer', on_delete=models.SET_NULL
    )


class LayerFrame(models.Model):
    name = models.CharField(max_length=255, default='Layer Frame')
    layer = models.ForeignKey(Layer, related_name='frames', on_delete=models.CASCADE)
    vector = models.ForeignKey(VectorData, null=True, on_delete=models.CASCADE)
    raster = models.ForeignKey(RasterData, null=True, on_delete=models.CASCADE)
    index = models.PositiveIntegerField(default=0)
    source_filters = models.JSONField(default=default_source_filters)
    metadata = models.JSONField(blank=True, null=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(models.Q(raster__isnull=False) & models.Q(vector__isnull=True))
                | (models.Q(raster__isnull=True) & models.Q(vector__isnull=False)),
                name='exactly_one_data',
            )
        ]

    def get_data(self):
        if self.raster is not None:
            return self.raster
        return self.vector


class LayerStyle(models.Model):
    name = models.CharField(max_length=255, default='Layer Style')
    layer = models.ForeignKey(Layer, related_name='styles', on_delete=models.CASCADE)
    project = models.ForeignKey(Project, related_name='styles', on_delete=models.CASCADE)
    style_spec = models.JSONField(blank=True, default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'layer', 'project'], name='unique_name_layer_project'
            )
        ]

    @property
    def schema(self):
        return LAYER_STYLE_SCHEMA

    def clean(self):
        if len(self.style_spec):
            validate(instance=self.style_spec, schema=self.schema)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self.save_color_configs()

    def save_color_configs(self):
        from .colors import ColorConfig, Colormap, ColormapConfig

        color_specs = self.style_spec.pop('colors', None)
        if color_specs is None:
            return
        names = []
        for color_spec in color_specs:
            name = color_spec.get('name')
            if name is None:
                continue
            names.append(name)
            color_config, _ = ColorConfig.objects.get_or_create(
                style=self,
                name=name,
            )
            color_config.visible = color_spec.get('visible', True)
            single_color = color_spec.get('single_color')
            if single_color is not None:
                color_config.single_color = single_color
                if color_config.colormap is not None:
                    color_config.colormap.delete()
                    color_config.colormap = None
            else:
                color_config.single_color = None
                colormap_spec = color_spec.get('colormap')
                colormap = Colormap.objects.get(id=colormap_spec.get('id'))
                map_range = colormap_spec.get('range')
                colormap_config_args = dict(
                    colormap=colormap,
                    color_by=colormap_spec.get('color_by'),
                    null_color=colormap_spec.get('null_color'),
                    discrete=colormap_spec.get('discrete', False),
                    n_colors=colormap_spec.get('n_colors'),
                    range_minimum=map_range[0],
                    range_maximum=map_range[1],
                )
                if color_config.colormap is not None:
                    color_config.colormap.update(**colormap_config_args)
                    color_config.colormap.save()
                else:
                    color_config.colormap = ColormapConfig.objects.create(**colormap_config_args)
            color_config.save()
        ColorConfig.objects.filter(style=self).exclude(name__in=names).delete()
