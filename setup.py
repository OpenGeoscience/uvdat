from pathlib import Path

from setuptools import find_packages, setup

readme_file = Path(__file__).parent / 'README.md'
if readme_file.exists():
    with readme_file.open() as f:
        long_description = f.read()
else:
    # When this is first installed in development Docker, README.md is not available
    long_description = ''

setup(
    name='uvdat',
    version='0.1.0',
    description='',
    long_description=long_description,
    long_description_content_type='text/markdown',
    license='Apache 2.0',
    author='Kitware, Inc.',
    author_email='kitware@kitware.com',
    keywords='',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Environment :: Web Environment',
        'Framework :: Django :: 3.0',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: Apache Software License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python',
    ],
    python_requires='>=3.10',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'celery',
        'django==4.1',
        # TODO: remove django version constraint
        # when girder4 becomes compatible with 4.2
        'django-allauth<0.56.0',
        # TODO: remove repo link after django-configurations 2.4.2 is released to PyPI
        # https://github.com/jazzband/django-configurations/pull/365
        'django-configurations[database,email] @ git+https://github.com/jazzband/django-configurations@master',
        'django-extensions',
        'django-filter',
        'django-oauth-toolkit',
        'djangorestframework',
        'django-large-image',
        'drf-yasg',
        'ijson',
        'matplotlib',
        'geojson2vt',
        'geopandas',
        'networkx',
        'pyshp',
        'rasterio',
        'urllib3==1.26.15',  # compensate for a bug affecting swagger docs page
        'webcolors',
        # Production-only
        'django-composed-configuration[prod]>=0.20',
        'django-s3-file-field[boto3]',
        'gunicorn',
    ],
    extras_require={
        'dev': [
            'django-composed-configuration[dev]>=0.18',
            'django-debug-toolbar',
            'django-s3-file-field[minio]',
            'ipython',
            'tox',
        ]
    },
)
