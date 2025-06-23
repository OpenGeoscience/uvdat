import json
from pathlib import Path

from django.db import models
from jsonschema import validate

from .data import RasterData, VectorData, VectorFeature
from .dataset import Dataset
from .project import Project

# TODO: Where is the best place for this file?
SCHEMA_FILE = Path(__file__).parent / 'layer_style_schema.json'
with open(SCHEMA_FILE) as f:
    LAYER_STYLE_SCHEMA = dict(json.load(f))


def default_source_filters():
    return dict(band=1)


class Layer(models.Model):
    name = models.CharField(max_length=255, default='Layer')
    dataset = models.ForeignKey(Dataset, related_name='layers', on_delete=models.CASCADE)
    metadata = models.JSONField(blank=True, null=True)

    def get_summary(self):
        summary = dict(feature_types=[], properties={})
        exclude_keys = ['node_id', 'edge_id', 'to_node_id', 'from_node_id']
        for feature in VectorFeature.objects.filter(
            vector_data__layerframe__in=self.frames.all()
        ).all():
            feature_type = feature.geometry.geom_type
            if feature_type not in summary['feature_types']:
                summary['feature_types'].append(feature_type)
            for k, v in feature.properties.items():
                if k not in exclude_keys and v is not None:
                    if k not in summary['properties']:
                        summary['properties'][k] = dict(value_set=set(), count=0)
                    summary['properties'][k]['value_set'].add(v)
                    summary['properties'][k]['count'] += 1
        for k, details in summary['properties'].items():
            types = set(type(v).__name__ for v in details['value_set'])
            summary['properties'][k]['types'] = types
            if len(types.intersection({'int', 'float'})) == len(types):
                # numeric values only
                value_range = [
                    min(details['value_set']),
                    max(details['value_set']),
                ]
                summary['properties'][k]['range'] = value_range
                summary['properties'][k]['sample_label'] = f'[{value_range[0]}, {value_range[1]}]'
            else:
                summary['properties'][k]['sample_label'] = ', '.join(
                    str(v) for v in list(details['value_set'])[:3]
                )
                if len(details['value_set']) > 3:
                    summary['properties'][k]['sample_label'] += '...'
        return summary


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
    is_default = models.BooleanField(default=False)
    style_spec = models.JSONField(blank=True, default=dict)

    @property
    def schema(self):
        return LAYER_STYLE_SCHEMA

    def clean(self):
        if self.is_default:
            for style in LayerStyle.objects.filter(layer=self.layer, is_default=True).exclude(
                id=self.id
            ):
                style.is_default = False
                style.save()
        if len(self.style_spec):
            validate(instance=self.style_spec, schema=self.schema)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self):
        if self.is_default:
            # pick a new default
            new_default = LayerStyle.objects.filter(layer=self.layer).exclude(id=self.id).first()
            if new_default is not None:
                new_default.is_default = True
                new_default.save()
        super(LayerStyle, self).delete()
