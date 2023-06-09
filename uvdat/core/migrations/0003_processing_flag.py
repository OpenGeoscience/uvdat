# Generated by Django 4.1 on 2023-07-07 14:48

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0002_city_and_dataset'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='city',
            options={'verbose_name_plural': 'cities'},
        ),
        migrations.AddField(
            model_name='dataset',
            name='processing',
            field=models.BooleanField(default=False),
        ),
    ]
