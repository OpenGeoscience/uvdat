# Generated by Django 4.1 on 2024-06-13 20:39

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_models_redesign'),
    ]

    operations = [
        migrations.AlterField(
            model_name='networkedge',
            name='name',
            field=models.CharField(max_length=255),
        ),
        migrations.AlterField(
            model_name='networknode',
            name='name',
            field=models.CharField(max_length=255),
        ),
    ]
