# Generated by Django 4.1 on 2023-05-17 16:08

import django.contrib.gis.db.models.fields
from django.contrib.postgres.operations import CreateExtension
from django.db import migrations, models
import django.db.models.deletion
import django_extensions.db.fields
import s3_file_field.fields


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('core', '0001_default_site'),
    ]

    operations = [
        CreateExtension("postgis"),
        migrations.CreateModel(
            name='City',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'created',
                    django_extensions.db.fields.CreationDateTimeField(
                        auto_now_add=True, verbose_name='created'
                    ),
                ),
                (
                    'modified',
                    django_extensions.db.fields.ModificationDateTimeField(
                        auto_now=True, verbose_name='modified'
                    ),
                ),
                ('name', models.CharField(max_length=255, unique=True)),
                ('center', django.contrib.gis.db.models.fields.PointField(srid=4326)),
                ('default_zoom', models.IntegerField(default=10)),
            ],
            options={
                'get_latest_by': 'modified',
                'abstract': False,
                'verbose_name_plural': 'cities',
            },
        ),
        migrations.CreateModel(
            name='Dataset',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'created',
                    django_extensions.db.fields.CreationDateTimeField(
                        auto_now_add=True, verbose_name='created'
                    ),
                ),
                (
                    'modified',
                    django_extensions.db.fields.ModificationDateTimeField(
                        auto_now=True, verbose_name='modified'
                    ),
                ),
                ('name', models.CharField(max_length=255, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('category', models.CharField(max_length=25)),
                ('style', models.JSONField(blank=True, null=True)),
                ('raw_data_archive', s3_file_field.fields.S3FileField(blank=True, null=True)),
                ('raw_data_type', models.CharField(default='shape_file_archive', max_length=25)),
                (
                    'city',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='core.city',
                        related_name="datasets",
                    ),
                ),
                ('geodata_file', s3_file_field.fields.S3FileField(blank=True, null=True)),
                ('vector_tiles_file', s3_file_field.fields.S3FileField(blank=True, null=True)),
                ('raster_file', s3_file_field.fields.S3FileField(blank=True, null=True)),
            ],
            options={
                'get_latest_by': 'modified',
                'abstract': False,
            },
        ),
    ]
