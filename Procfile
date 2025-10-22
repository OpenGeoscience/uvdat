release: ./manage.py migrate
web: daphne -b 0.0.0.0 -p $PORT geoinsight.asgi:application
worker: REMAP_SIGTERM=SIGQUIT celery --app geoinsight.celery worker --loglevel INFO --without-heartbeat
