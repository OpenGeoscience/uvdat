# Generated by Django 5.0.7 on 2024-12-20 17:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_curbs_aid_simulation'),
    ]

    operations = [
        migrations.AlterField(
            model_name='fileitem',
            name='file_size',
            field=models.PositiveBigIntegerField(null=True),
        ),
    ]
