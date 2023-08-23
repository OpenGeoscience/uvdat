# Generated by Django 4.1 on 2023-08-10 21:57

import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0005_dataset_metadata'),
    ]

    operations = [
        migrations.CreateModel(
            name='Region',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('name', models.CharField(max_length=255, unique=True)),
                ('properties', models.JSONField(blank=True, null=True)),
                ('boundary', django.contrib.gis.db.models.fields.MultiPolygonField(srid=4326)),
                (
                    'city',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='regions',
                        to='core.city',
                    ),
                ),
                (
                    'dataset',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='regions',
                        to='core.dataset',
                    ),
                ),
            ],
        ),
    ]
