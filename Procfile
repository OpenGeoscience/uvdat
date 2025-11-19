release: python ./manage.py migrate
web: daphne --bind 0.0.0.0 --port $PORT geoinsight.asgi:application
worker: REMAP_SIGTERM=SIGQUIT celery --app geoinsight.celery worker --loglevel INFO --without-heartbeat
