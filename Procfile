release: ./manage.py migrate
web: gunicorn --bind 0.0.0.0:$PORT uvdat.wsgi
worker: REMAP_SIGTERM=SIGQUIT celery --app uvdat.celery worker --loglevel INFO --without-heartbeat
