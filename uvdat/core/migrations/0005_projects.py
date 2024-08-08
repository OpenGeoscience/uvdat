# Generated by Django 5.0.7 on 2024-08-08 15:18

from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_files_and_networks'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('name', models.CharField(max_length=255, unique=True)),
                ('default_map_center', django.contrib.gis.db.models.fields.PointField(srid=4326)),
                ('default_map_zoom', models.IntegerField(default=10)),
            ],
        ),
        migrations.RemoveField(
            model_name='context',
            name='datasets',
        ),
        migrations.RemoveField(
            model_name='simulationresult',
            name='context',
        ),
        migrations.RemoveField(
            model_name='chart',
            name='context',
        ),
        migrations.RemoveField(
            model_name='derivedregion',
            name='context',
        ),
        migrations.AddField(
            model_name='project',
            name='collaborators',
            field=models.ManyToManyField(
                related_name='read_write_projects', to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name='project',
            name='datasets',
            field=models.ManyToManyField(blank=True, to='core.dataset'),
        ),
        migrations.AddField(
            model_name='project',
            name='followers',
            field=models.ManyToManyField(
                related_name='read_only_projects', to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name='project',
            name='owner',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name='chart',
            name='project',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='charts',
                to='core.project',
            ),
        ),
        migrations.AddField(
            model_name='derivedregion',
            name='project',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='derived_regions',
                to='core.project',
            ),
        ),
        migrations.AddField(
            model_name='simulationresult',
            name='project',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='simulation_results',
                to='core.project',
            ),
        ),
        migrations.AddConstraint(
            model_name='derivedregion',
            constraint=models.UniqueConstraint(
                fields=('project', 'name'), name='unique-derived-region-name'
            ),
        ),
        migrations.DeleteModel(
            name='Context',
        ),
    ]
