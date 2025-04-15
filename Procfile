release: ./manage.py migrate
web: daphne -b 0.0.0.0 -p $PORT uvdat.asgi:application
worker: REMAP_SIGTERM=SIGQUIT celery --app uvdat.celery worker --loglevel INFO --without-heartbeat
