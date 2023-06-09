# UVDAT: Urban Visualization and Data Analysis Toolkit

Supports data-driven research for the growth, progress, and welfare of urban areas to enable and inform decisions and policy.

_Currently in Phase 1 of development_

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

## Testing
### Initial Setup
tox is used to execute all tests.
tox is installed automatically with the `dev` package extra.

When running the "Develop with Docker" configuration, all tox commands must be run as
`docker-compose run --rm django tox`; extra arguments may also be appended to this form.

### Running Tests
Run `tox` to launch the full test suite.

Individual test environments may be selectively run.
This also allows additional options to be be added.
Useful sub-commands include:
* `tox -e lint`: Run only the style checks
* `tox -e type`: Run only the type checks
* `tox -e test`: Run only the pytest-driven tests

To automatically reformat all code to comply with
some (but not all) of the style checks, run `tox -e format`.
