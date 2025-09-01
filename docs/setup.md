### Initial Setup

1. Prepare the web client with the following steps:

   1. Run `cp web/.env.example web/.env`.
   2. Install client dependencies by running `cd web && npm i`.

2. Run the docker containers with `docker compose up`. Be sure to check that all containers were able to start and stay running successfully before continuing.
3. While the containers are up, run the following commands in a separate terminal to prepare the database:

   a. Run `docker compose run --rm django ./manage.py migrate`.

   b. Run `docker compose run --rm django ./manage.py createsuperuser`
   and follow the prompts to create your own user.

   c. Run `docker compose run --rm django ./manage.py makeclient` to create a client Application object for authentication.

       i. Run `docker compose run --rm django ./manage.py ingest {JSON file}` to use sample data.

          The JSON file can either be `multiframe_test.json`, `boston_floods.json`, `la_wildfires.json` or `./new_york_energy/data.json`

### Run Application

1. Run `docker compose up`.
2. You can access the admin page at port 8000: http://localhost:8000/admin/
3. The user interface is on port **8080**: http://localhost:8080/
4. When finished, use `Ctrl+C` to stop the docker compose command.

### Application Maintenance

Occasionally, new package dependencies or schema changes will necessitate
maintenance. To non-destructively update your development stack at any time:

1. Run `docker compose pull`
2. Run `docker compose build --pull --no-cache`
3. Run `docker compose run --rm django ./manage.py migrate`
