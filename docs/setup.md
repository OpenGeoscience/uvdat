### Initial Setup
1. To prepare the web client, install its requirements with `cd web && npm i`.
2. Run the docker containers with `docker-compose up`. Be sure to check that all containers were able to start and stay running successfully before continuing.
3. While the containers are up, run the following commands in a separate terminal to prepare the database:

   a. Run `docker-compose run --rm django ./manage.py migrate`.

   b. Run `docker-compose run --rm django ./manage.py createsuperuser`
     and follow the prompts to create your own user.

   c. Run `docker-compose run --rm django ./manage.py populate` to use sample data.

### Run Application
1. Run `docker-compose up`.
2. You can access the admin page at port 8000: http://localhost:8000/admin/
3. The user interface is on port **8080**: http://localhost:8080/
4. When finished, use `Ctrl+C` to stop the docker-compose command.

### Application Maintenance
Occasionally, new package dependencies or schema changes will necessitate
maintenance. To non-destructively update your development stack at any time:
1. Run `docker-compose pull`
2. Run `docker-compose build --pull --no-cache`
3. Run `docker-compose run --rm django ./manage.py migrate`
