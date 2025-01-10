# CHANGELOG


## v0.8.0 (2025-01-10)

### Bug Fixes

- Default to no color map for client raster viz
  ([`ff0c075`](https://github.com/OpenGeoscience/uvdat/commit/ff0c0753d72e7d7b1c5dbaba7ccdba053c295041))

- Make `tile2net` import lazy
  ([`5aa2ff2`](https://github.com/OpenGeoscience/uvdat/commit/5aa2ff2d0084b575fbfab1ecc2f02400550bffaf))

- Use `band` argument in tile params when applying colormap
  ([`5511b25`](https://github.com/OpenGeoscience/uvdat/commit/5511b25db56e52d3cf6e1e632273e03f1b752209))

### Build System

- Set up celery docker container with tile2net requirements
  ([`b56303b`](https://github.com/OpenGeoscience/uvdat/commit/b56303b45d6e01ec6b880810a9deb603a057bc69))

### Chores

- Clean up unnecessary additions
  ([`9a2008e`](https://github.com/OpenGeoscience/uvdat/commit/9a2008e07ef54f710283512005c9cf0ae95e9ad1))

### Features

- Add `curbs_aid` use case to populate script, ingest orthoimagery
  ([`619675b`](https://github.com/OpenGeoscience/uvdat/commit/619675bc34aa73343c1c070e3fef880065b9c3e9))

- Add `segment_curbs` task using `tile2net`
  ([`7d3f82d`](https://github.com/OpenGeoscience/uvdat/commit/7d3f82dd289c543df77d50594bde279c5ce44cb4))

- Add Boston Orthoimagery dataset to `boston_floods` use case
  ([`23dedc2`](https://github.com/OpenGeoscience/uvdat/commit/23dedc2ab4a2743978570a5f1331cd981255f0b8))

- Add custom UI for sim results that return datasets
  ([`ef26372`](https://github.com/OpenGeoscience/uvdat/commit/ef2637228ac57910095e4a9a03b4f4d077251842))

- Add script for compositing orthoimagery to `sample_data` folder
  ([`8310f00`](https://github.com/OpenGeoscience/uvdat/commit/8310f009922381bb46eccafbe892e34a70f4ed16))

### Refactoring

- Remove `composite_orthoimagery.py`
  ([`e3f1f48`](https://github.com/OpenGeoscience/uvdat/commit/e3f1f48cc51fa05870350e9d5eefd1e9c2803faa))

- Split `create_raster_map_layer` function and add comments
  ([`f493c8d`](https://github.com/OpenGeoscience/uvdat/commit/f493c8da3bda444d3d5c579bdfd5da8a0c946a91))


## v0.7.0 (2024-11-18)

### Bug Fixes

- Add missing hyphen in requirements list
  ([`82835b2`](https://github.com/OpenGeoscience/uvdat/commit/82835b272914f161836d135e926143db2fecfd45))

### Features

- Add precommit to repo
  ([`fa55c13`](https://github.com/OpenGeoscience/uvdat/commit/fa55c1364a006cc965c281bd16db6741af20ca37))


## v0.6.1 (2024-11-12)

### Bug Fixes

- Add missing env vars
  ([`5ef7507`](https://github.com/OpenGeoscience/uvdat/commit/5ef75079314597f0bcdb8ce44d8b38098fe93d6b))

- Fix bug in project permission logic
  ([`8dcd62b`](https://github.com/OpenGeoscience/uvdat/commit/8dcd62b933118d736fed2d8b91185d71839245f2))

- Fix incorrect dataset permission logic
  ([`18fa882`](https://github.com/OpenGeoscience/uvdat/commit/18fa88256e36e8e12208f62f8078e6755456b3d5))

- Fix linting errors
  ([`85e0415`](https://github.com/OpenGeoscience/uvdat/commit/85e04158d037373966a7b5e5645d7946e8099b6f))

### Continuous Integration

- Add nightly CI for slow tests
  ([`879a256`](https://github.com/OpenGeoscience/uvdat/commit/879a2563eb5d76c8a1d8f56bc3eb1be5516db4a7))

### Documentation

- Add comment
  ([`2e9bb17`](https://github.com/OpenGeoscience/uvdat/commit/2e9bb17d14441c41e4e0101582f4468229f66457))

### Refactoring

- Improve project perm functions
  ([`2bdd2d2`](https://github.com/OpenGeoscience/uvdat/commit/2bdd2d298c205cc7c8e9bffd3fbff9b047817d0a))

- Remove all dataset modification endpoints
  ([`a22252a`](https://github.com/OpenGeoscience/uvdat/commit/a22252a9586d46d8b37489f2126185e251d917cf))

- Remove unused dataset endpoint
  ([`e748ad6`](https://github.com/OpenGeoscience/uvdat/commit/e748ad658aac81ae51dafe237250cf71ab2e43e9))

- Remove unused endpoints
  ([`023da47`](https://github.com/OpenGeoscience/uvdat/commit/023da471df440dae2ec42da5c1f4b8a49b518628))

- Remove unused map layer endpoints
  ([`2aeb5db`](https://github.com/OpenGeoscience/uvdat/commit/2aeb5db010a020a63fc42c3b4c7b66a3daf3d02f))

- Remove unused simulation endpoints
  ([`2545952`](https://github.com/OpenGeoscience/uvdat/commit/254595214f478ebbae0bb9de27903c50f07a70d6))

- Reorg dependencies
  ([`a387d41`](https://github.com/OpenGeoscience/uvdat/commit/a387d4150e8f466ad4c73314e400a037239f0c25))

### Testing

- Add basic testing infrastructure
  ([`c536c99`](https://github.com/OpenGeoscience/uvdat/commit/c536c9986c61853b0455ea3b00533059bcc2f4a9))

- Add celery task testing config
  ([`737a3e6`](https://github.com/OpenGeoscience/uvdat/commit/737a3e6df019b975a5bc709406ce24b4e9d932d2))

- Add dataset GCC tests
  ([`6f9a18e`](https://github.com/OpenGeoscience/uvdat/commit/6f9a18ecc50bd0a474c92d505b15250923131e4d))

- Add dataset map layer factories and tests
  ([`b1744f4`](https://github.com/OpenGeoscience/uvdat/commit/b1744f4a995f01986b4297c9488fb5654af51633))

- Add dataset network tests
  ([`c200d4d`](https://github.com/OpenGeoscience/uvdat/commit/c200d4de7e569ba5f25e67cf486d06972f7935a3))

- Add more project tests
  ([`5d425df`](https://github.com/OpenGeoscience/uvdat/commit/5d425dff80996931d1dafd70880a6af46caef464))

- Don't run slow tests by default
  ([`5dc04b6`](https://github.com/OpenGeoscience/uvdat/commit/5dc04b64df17ee77eee140e42eadd0584f78d161))

- Remove old api tests
  ([`cb43a1f`](https://github.com/OpenGeoscience/uvdat/commit/cb43a1f897962bc85ce658485bb4f12e1c378b4c))

- Remove use of pytest-factoryboy
  ([`1ff9408`](https://github.com/OpenGeoscience/uvdat/commit/1ff9408e571f7d851824c5bf9d3a87454866cf2e))

- Simplify use of network edge fixtures
  ([`01e7ae3`](https://github.com/OpenGeoscience/uvdat/commit/01e7ae352c64788ebdc04f5f6ed1cd701f560594))


## v0.6.0 (2024-11-06)

### Bug Fixes

- Update version in `setup.py` and `package.json` with semantic release
  ([`7f6ce9d`](https://github.com/OpenGeoscience/uvdat/commit/7f6ce9da0acccdf39cebb06b689389e3717119ac))

### Features

- Add version tag to toolbar in UI
  ([`6f6d04d`](https://github.com/OpenGeoscience/uvdat/commit/6f6d04d2a3ed9ca5260c5e8e11a8f536fd5e4ed9))

- Move version to menu, add hash, add copy buttons, add repo link
  ([`f1b1b34`](https://github.com/OpenGeoscience/uvdat/commit/f1b1b348d6d30092a64026bb5531c0cbd58a55e0))


## v0.5.1 (2024-10-17)

### Bug Fixes

- Add signals to delete files when an object with a FileField is deleted
  ([`08de376`](https://github.com/OpenGeoscience/uvdat/commit/08de3762c27dd0efb8d280e9c5f1fd8a356fd3fc))

- Replace `pre_delete` with `post_delete`
  ([`4ba2bcb`](https://github.com/OpenGeoscience/uvdat/commit/4ba2bcb2555639adfc25b537c293cd181698fbdf))

### Continuous Integration

- Add step to install GDAL
  ([`820cd86`](https://github.com/OpenGeoscience/uvdat/commit/820cd861115a82d4d8a20cdc1971f8bbeb198a38))

- Fix environment vars
  ([`8c90c8f`](https://github.com/OpenGeoscience/uvdat/commit/8c90c8f7bd398b48a66a1e10121ec621ac2c21ab))

- Pin versions of ubuntu, python, and ubuntugis
  ([`08271ba`](https://github.com/OpenGeoscience/uvdat/commit/08271ba9d3e1471cdeafbf8b4888ccebde774df4))

- Switch postgres image to postgis
  ([`673df3a`](https://github.com/OpenGeoscience/uvdat/commit/673df3a39d6d985f5aa36939a6348128d82a5636))

- Update github actions to use services
  ([`3ee1d85`](https://github.com/OpenGeoscience/uvdat/commit/3ee1d8560a6fe60306f70635e9e747de0b8c26e6))


## v0.5.0 (2024-10-10)

### Bug Fixes

- Remove current project owner from users list
  ([`7051ab4`](https://github.com/OpenGeoscience/uvdat/commit/7051ab43be0fbaa66eed735b4f3b5b4a675bed74))


## v0.4.2 (2024-10-10)

### Bug Fixes

- Add `item_counts` to `ProjectSerializer` for new sidebar design
  ([`3a71b3a`](https://github.com/OpenGeoscience/uvdat/commit/3a71b3aa0a302002c0096535849c6ae175e598ff))

- Add matplotlib to requirements for raster colormaps
  ([`971e991`](https://github.com/OpenGeoscience/uvdat/commit/971e9914bc15cf9c7be8c706fdb1663c43643650))

- Adjust map state watchers
  ([`58f59a4`](https://github.com/OpenGeoscience/uvdat/commit/58f59a4b0cae192aba5a091e8288cac80e84115b))

- Change groupBy control to radio buttons
  ([`b933d2f`](https://github.com/OpenGeoscience/uvdat/commit/b933d2f842f8d4401fd1a3febc0713020e0422a5))

- Change loading behavior of Project contents panels
  ([`407eccf`](https://github.com/OpenGeoscience/uvdat/commit/407eccf53eb68b6d3b60579c6cc35baf0d07eac1))

- Improve map location menu hover/click behavior
  ([`d2ad119`](https://github.com/OpenGeoscience/uvdat/commit/d2ad11919dcb63a82e7e29e69709dbeac670cb39))

- Modify `savePermissions` to move users between followers and collaborators lists
  ([`1c83360`](https://github.com/OpenGeoscience/uvdat/commit/1c83360df559c9eb41bde1a0cfb9c336b4b63658))

- Order Project queryset by name
  ([`80fe54e`](https://github.com/OpenGeoscience/uvdat/commit/80fe54eca12635cc9bc16a234fe1ba68ab329c06))

- Prevent multiple permissions for single user in project
  ([`16e6140`](https://github.com/OpenGeoscience/uvdat/commit/16e61409b11fec074c7cec673b99c34548323306))

- Reverse map coord ordering in API
  ([`744e124`](https://github.com/OpenGeoscience/uvdat/commit/744e12452331f7f382f1e48e6aa32d924bf4890a))

- Update `set_permissions` call in `ProjectViewSet.partial_update`
  ([`99bee91`](https://github.com/OpenGeoscience/uvdat/commit/99bee913574e2b04cf113e6d1a4985d6885a32f0))

- Update references to `resetMap` -> `setMapCenter`
  ([`513959a`](https://github.com/OpenGeoscience/uvdat/commit/513959a1408d3c0eedcc4b89da82bb641826b2e7))

- Update setting permissions in Project `partial_update`
  ([`294ab3c`](https://github.com/OpenGeoscience/uvdat/commit/294ab3c69841db3b8a2ea18bff11c3731e997e72))

- Use `pipx` action in lint workflow to avoid "externally managed environment" error
  ([`ad76188`](https://github.com/OpenGeoscience/uvdat/commit/ad76188e02828bcbbb63a8bb1984c381549c4466))

### Code Style

- Adjust vertical alignment of object counts, flush with icons
  ([`a070f83`](https://github.com/OpenGeoscience/uvdat/commit/a070f833b9027742e17e405a7d2612a4975c2d91))

- Remove unused imports
  ([`07f1a9d`](https://github.com/OpenGeoscience/uvdat/commit/07f1a9de4b60b9b078dd9829648b171ceb594339))

- Replace double equals with triple equals
  ([`245871b`](https://github.com/OpenGeoscience/uvdat/commit/245871b2f7b0861443b2a7d619fc43c2b34f028e))

- Use title case for component tag
  ([`ba7fbcf`](https://github.com/OpenGeoscience/uvdat/commit/ba7fbcfb1e3ac4eb8f6ea22aa5ae6783739ba7b6))

### Features

- Add Access Control interface
  ([`dba0516`](https://github.com/OpenGeoscience/uvdat/commit/dba0516f343641da615aaa9912c828a880f0a591))

- Add basic ProjectConfig component
  ([`e7b29bb`](https://github.com/OpenGeoscience/uvdat/commit/e7b29bb00b2da2ab96e61cd7dbe1881ece13c5b2))

- Add Dataset selection panel to Project Config page
  ([`bb21859`](https://github.com/OpenGeoscience/uvdat/commit/bb2185903fba8ee4189c415206ed8a24250233fb))

- Create/delete projects, edit project names and default map positions
  ([`d91be55`](https://github.com/OpenGeoscience/uvdat/commit/d91be555dd1a3ba7161775ff891dc26230a723ff))

- Default to `flyTo` when setting map center
  ([`ce33080`](https://github.com/OpenGeoscience/uvdat/commit/ce3308061dbaec28c955cea79d996319c95579f6))

- Toggle dataset layers with maplibre
  ([`b84303d`](https://github.com/OpenGeoscience/uvdat/commit/b84303d806776500b20a29191ee2ad8c814da193))

### Refactoring

- `setmapcenter` implicit undefined argument
  ([`ccb3e39`](https://github.com/OpenGeoscience/uvdat/commit/ccb3e39786a591c939434b2cb8eccfda8ef25073))

- Apply suggestion to `toggleDatasets` function in `ProjectContents`
  ([`754d1be`](https://github.com/OpenGeoscience/uvdat/commit/754d1beb89fd984a8097c1429a31e4ab311a2b05))

- Apply suggestion to use sets in `savePermissions`
  ([`f5bc7ad`](https://github.com/OpenGeoscience/uvdat/commit/f5bc7ad65e11b246d01661931323f68c51cf1269))

- Enforce consistent naming of permission levels
  ([`a843439`](https://github.com/OpenGeoscience/uvdat/commit/a843439b046ea507f20806c631c89f8d6cac720c))

- Explicitly define acceptable values for `projectConfigMode`
  ([`6ce1e6f`](https://github.com/OpenGeoscience/uvdat/commit/6ce1e6f43bb1e17533acab52aab858ce7c4afd5f))

- Explicitly define acceptable values for `saving`
  ([`38d2cc9`](https://github.com/OpenGeoscience/uvdat/commit/38d2cc91200a0e723a6147f7caf67ec0cb4a40a5))

- Populate store vars when fetching for Project contents
  ([`7afef9b`](https://github.com/OpenGeoscience/uvdat/commit/7afef9be6ecca1db97135dddca7fa3bf223770e2))

- Remove ownership claim mode
  ([`816dd25`](https://github.com/OpenGeoscience/uvdat/commit/816dd2518bd5e5c98049242b5668a068d220a4c1))

- Separate Project update endpoints, don't override `partial_update`
  ([`d2bffde`](https://github.com/OpenGeoscience/uvdat/commit/d2bffde373e24062094136fdfeaf3fd6a46934d8))

- Update web/src/storeFunctions.ts
  ([`cff13c4`](https://github.com/OpenGeoscience/uvdat/commit/cff13c4cdadaf97b27d3e1588ee93930aa90af81))

Co-authored-by: Jacob Nesbitt <jjnesbitt2@gmail.com>

- Use FloatField for Project.default_map_zoom
  ([`6d84564`](https://github.com/OpenGeoscience/uvdat/commit/6d845640216714ccb89074c5ad9683aa1cff8e14))

- Use Vue `script setup` syntax on new/modified components
  ([`7eb640c`](https://github.com/OpenGeoscience/uvdat/commit/7eb640c9114e88c2e944ba0698c9707b077e3ae1))


## v0.4.1 (2024-10-01)

### Performance Improvements

- Implement GCC algorithm in native postgres
  ([`ba33eb0`](https://github.com/OpenGeoscience/uvdat/commit/ba33eb08fb44b39d3d3159539538d42db4b9bceb))

### Refactoring

- Move find_network_gcc into Network.get_gcc
  ([`1eadf03`](https://github.com/OpenGeoscience/uvdat/commit/1eadf03c9949d6d85dce9f2f94cb6e0d32a24925))


## v0.4.0 (2024-10-01)

### Bug Fixes

- Add `VectorFeature` clause to `get_object_queryset`
  ([`3178461`](https://github.com/OpenGeoscience/uvdat/commit/3178461bd1a02cfb286bb3c23407c29529e2de73))

- Add authentication to maplibre tile requests
  ([`4906e9f`](https://github.com/OpenGeoscience/uvdat/commit/4906e9fab2d93fd7058e4c82cd6e53c94e36f09e))

- Add homepage redirect url
  ([`7372b16`](https://github.com/OpenGeoscience/uvdat/commit/7372b16d06d844207e364dad695fb419997f3176))

- Add import to `ingest_use_case`
  ([`8d1d9db`](https://github.com/OpenGeoscience/uvdat/commit/8d1d9dbbba930749af9ef742a002e7f00e8f1e1d))

- Add missing django env var to Celery config in `docker-compose.override.yml`
  ([`faac2fd`](https://github.com/OpenGeoscience/uvdat/commit/faac2fdd572e9d7a2906c46f0f3895b6ce931b9d))

- Add watcher for `showMapBaseLayer`
  ([`df03bad`](https://github.com/OpenGeoscience/uvdat/commit/df03badcd8e4c15c16bb0d23571351ba517fcf49))

- Address some server-side API bugs
  ([`6943cb4`](https://github.com/OpenGeoscience/uvdat/commit/6943cb4696cfb4de250fd55e924448d742b0aa33))

- Allow filtering by `project_id` in request params
  ([`fadc263`](https://github.com/OpenGeoscience/uvdat/commit/fadc2634a90e61e302bfaced0dc383aa4d9950d1))

- Enforce an owner on server-created projects
  ([`de9725c`](https://github.com/OpenGeoscience/uvdat/commit/de9725c968b92793ef5f0494f119f557720a91e2))

- Include constraint removal step in migration file
  ([`f9a3221`](https://github.com/OpenGeoscience/uvdat/commit/f9a3221483a2adbc65eecd96237206585b282160))

- Remove `SESSION_COOKIE_AGE` value override
  ([`ffbd515`](https://github.com/OpenGeoscience/uvdat/commit/ffbd5159241e6634c2ba019632f99fb832d5bda0))

- Resolve merge conflicts after rebase
  ([`b7f1cca`](https://github.com/OpenGeoscience/uvdat/commit/b7f1cca5b2b4b98a8e0b8b01c56af4c854cc3762))

- Roll back change to region viewset inheritance
  ([`e317c6d`](https://github.com/OpenGeoscience/uvdat/commit/e317c6d3e327500324eb28f6d1df1c3656620c74))

- Update `set_permissions` call in `test_api`
  ([`e157327`](https://github.com/OpenGeoscience/uvdat/commit/e157327a6329a3ee0b3035046c0d449da9dd7e9f))

- Update `set_permissions` call in Project `perform_create`
  ([`61e7a29`](https://github.com/OpenGeoscience/uvdat/commit/61e7a298e4354bbda4ea945bb6d106e5afc2f9bb))

- Update permissions fields on `ProjectSerializer`
  ([`2e66d31`](https://github.com/OpenGeoscience/uvdat/commit/2e66d317aa67fb02644a4bd798e52907a7b1ff3b))

### Code Style

- Fix lint errors
  ([`61f9767`](https://github.com/OpenGeoscience/uvdat/commit/61f97670c52de649533fa1315cf3a1d4aa9f7770))

- Lint fixes
  ([`10330c3`](https://github.com/OpenGeoscience/uvdat/commit/10330c359f13bb93c8ead80e9fa3ae7508242681))

- Remove change to flake8 rules in `tox.ini`
  ([`52c9ffe`](https://github.com/OpenGeoscience/uvdat/commit/52c9ffe6d482e686a56ee4bbb288a3aa4aa7dcac))

- Remove unused imports and variables
  ([`7bb8976`](https://github.com/OpenGeoscience/uvdat/commit/7bb89764a0cdcdded2b5bc865b65b2f6c13a71e1))

### Documentation

- Add `makeclient` step to Setup Guide
  ([`c3b4ac2`](https://github.com/OpenGeoscience/uvdat/commit/c3b4ac24dad2a1d27450957a08223b0c01ff5a4c))

### Features

- Add access control check functions on each model
  ([`245a04f`](https://github.com/OpenGeoscience/uvdat/commit/245a04f87a6a5116e0e4f0e16059c2961b171861))

- Client-side changes for authentication
  ([`a3bd8dc`](https://github.com/OpenGeoscience/uvdat/commit/a3bd8dce2515c04764812cd6e2ec77f9f3d3d049))

- Override signup form to include name fields
  ([`de74292`](https://github.com/OpenGeoscience/uvdat/commit/de74292bc41128aefe670d075193f3e5fb96c911))

- Replace Context model with Project model
  ([`003f88f`](https://github.com/OpenGeoscience/uvdat/commit/003f88f29b9c51355426e71d196437100ded1e1e))

- Server-side changes for authentication
  ([`b60591c`](https://github.com/OpenGeoscience/uvdat/commit/b60591c0526144ba7629cc5e9bc6810e459239d5))

- Update API to use AccessControl filter backend
  ([`1754ac3`](https://github.com/OpenGeoscience/uvdat/commit/1754ac318a2c2a025ed075af9df5cfc6ad72b9d4))

### Refactoring

- Add comment to `urls.py`
  ([`af567f1`](https://github.com/OpenGeoscience/uvdat/commit/af567f19997a7b4d95f8560f88aac64a5f904776))

- Add explanatory comment to Map's `transformRequest` function
  ([`9f6c9ab`](https://github.com/OpenGeoscience/uvdat/commit/9f6c9ab78e1e8784a4c1a2530be09c0b60dfc666))

- Apply suggestions to `guardian.py`
  ([`f831cf3`](https://github.com/OpenGeoscience/uvdat/commit/f831cf38eefd71fce0d36d418bb3e6810b6ef144))

- Move `project_id` query param filtering to `get_queryset` on relevant ViewSets
  ([`305f0b2`](https://github.com/OpenGeoscience/uvdat/commit/305f0b2d6d94a985c46579799257a3e9c115f51d))

- Remove permission fields from Project model and add `update_permissions` method
  ([`5935f62`](https://github.com/OpenGeoscience/uvdat/commit/5935f62cfbf39eeb3cdf4bbea827645768a3993c))

- Rename `guardian.py` -> `access_control.py`
  ([`3315a4d`](https://github.com/OpenGeoscience/uvdat/commit/3315a4da81a2dd7ab8ae7e925fa257a949155969))

- Update `Dataset.is_in_project` function
  ([`d78a494`](https://github.com/OpenGeoscience/uvdat/commit/d78a4941266da8f0a5ca541a512b3c83cc7bb2ef))

- Update `guardian.py`
  ([`9989e6f`](https://github.com/OpenGeoscience/uvdat/commit/9989e6f6aee6aaf3377cec43907911476c1e05e5))

- Update `guardian.py` to get passing permissions tests
  ([`934f729`](https://github.com/OpenGeoscience/uvdat/commit/934f729ec48e72dfbcc9d4736029286119330ec8))

- Update `ingest_projects` function
  ([`318f695`](https://github.com/OpenGeoscience/uvdat/commit/318f695abe7b3652fff3bbba4804b2113ce8c256))

- Update `makeclient` management command
  ([`88af424`](https://github.com/OpenGeoscience/uvdat/commit/88af42465644d78751e9859e605beb351d9a5f3c))

### Testing

- Add a test for API permissions
  ([`bc1a27e`](https://github.com/OpenGeoscience/uvdat/commit/bc1a27e765be53a192ca2f34219353b7abff867c))

- Ensure a superuser exists at beginning of populate test
  ([`b614f13`](https://github.com/OpenGeoscience/uvdat/commit/b614f13daa05d85e8b3583966805b05f025f5808))

- Pass homepage url env var through tox environments
  ([`4b3a0bd`](https://github.com/OpenGeoscience/uvdat/commit/4b3a0bd62d9375881fec5a72b6a589e2a514b5b5))

- Refactor API tests, split up by viewset
  ([`c5deb96`](https://github.com/OpenGeoscience/uvdat/commit/c5deb962579dd37a96ffd8d7b41180adecaaaa66))


## v0.3.0 (2024-08-21)

### Bug Fixes

- `network.dataset` -> `dataset`
  ([`f859588`](https://github.com/OpenGeoscience/uvdat/commit/f859588f1e5d4142dec8c2c40db4974757ed48f4))

- Filter properties upon import (key and value must exist)
  ([`e2c7549`](https://github.com/OpenGeoscience/uvdat/commit/e2c754949ff2ca66e7b67bdca4c9fb55f4aadbcb))

- Improve speed and accuracy of network interpretation algorithm
  ([`29650e7`](https://github.com/OpenGeoscience/uvdat/commit/29650e70397b367d066e23e575441330b31368f5))

- Ingest contexts before charts
  ([`df98b5d`](https://github.com/OpenGeoscience/uvdat/commit/df98b5d72ac16471c55127e58327d1b587089276))

- Only delete old map layers at beginning of dataset ingest
  ([`d71c90a`](https://github.com/OpenGeoscience/uvdat/commit/d71c90a73d9ff28ab4adddfc2f5478bf01efa904))

- Remove other usages of module reference for nysdp datasets
  ([`ee55020`](https://github.com/OpenGeoscience/uvdat/commit/ee550201c20bd724d02a7d736a8807d88afb001b))

- Remove unintentional quotes
  ([`296dc78`](https://github.com/OpenGeoscience/uvdat/commit/296dc7865d37dc0bbed1e0838e29a6df31793589))

- Small bug fixes
  ([`478f58a`](https://github.com/OpenGeoscience/uvdat/commit/478f58a1f2d2e2b757a4058e4a14679e7ee7203a))

### Code Style

- Additional style fixes
  ([`3f18006`](https://github.com/OpenGeoscience/uvdat/commit/3f180067ba6ee44ff9c0f7a9d6ac06840180d09e))

- Reformat with tox
  ([`0f985c9`](https://github.com/OpenGeoscience/uvdat/commit/0f985c96452d0fa834b371f990b045af85e4d29c))

### Features

- Add import script to load county networks from exported geojson files
  ([`0bb90a4`](https://github.com/OpenGeoscience/uvdat/commit/0bb90a432686168797fbde5c5a4f3ba935208027))

### Refactoring

- Create ingest modules with `convert_dataset` function for each use case
  ([`48a769d`](https://github.com/OpenGeoscience/uvdat/commit/48a769d0511dee3dbf929b779ca198885d00b15c))

- Remove unnecessary string casting
  ([`fb2cb07`](https://github.com/OpenGeoscience/uvdat/commit/fb2cb073be55d6fd22e78376fc22978efc660c60))

- Rename `vector_features_from_network` -> `create_vector_features_from_network`
  ([`a287c78`](https://github.com/OpenGeoscience/uvdat/commit/a287c78f0ba11aa945792c39899a94955b66fa67))

### Testing

- Adjust expected number of contexts in populate test
  ([`11c2c83`](https://github.com/OpenGeoscience/uvdat/commit/11c2c8315b49076709ab9bd46cdda90e549ab690))


## v0.2.0 (2024-08-21)

### Bug Fixes

- Remove old name reference
  ([`bfd69c2`](https://github.com/OpenGeoscience/uvdat/commit/bfd69c2f7fd8e16cd8e39424d03f22f72c21bc9f))

- Small bug fixes
  ([`87279bc`](https://github.com/OpenGeoscience/uvdat/commit/87279bce6a19bec2f4979c7f381913734ad9d655))

- Undo change to expected number of contexts
  ([`48fe642`](https://github.com/OpenGeoscience/uvdat/commit/48fe642555bbfe995f57151ccfe5a99ebdf6349e))

### Code Style

- Lint fixes
  ([`d7c6ef6`](https://github.com/OpenGeoscience/uvdat/commit/d7c6ef6f6bb2915305a495e649a07cf02456b1cc))

- Reformat with black
  ([`431537b`](https://github.com/OpenGeoscience/uvdat/commit/431537b5e495be578f2a30c588d3a893e7ac4413))

### Features

- Add rest viewsets for file item and network models
  ([`53e54e5`](https://github.com/OpenGeoscience/uvdat/commit/53e54e5dfdb6c530f8238e7be671afb2dbcc13d0))

### Refactoring

- Apply suggested changes
  ([`f50de69`](https://github.com/OpenGeoscience/uvdat/commit/f50de697a5dc8abb7e98b00d17b233cf69fa82a1))

### Testing

- Update OSMnx test expected number of nodes and edges
  ([`95c8c8a`](https://github.com/OpenGeoscience/uvdat/commit/95c8c8a729538bc515676c8600a35f28a2612dab))


## v0.1.0 (2024-08-19)

### Features

- Pin dependency versions in `setup.py`
  ([`2f3b671`](https://github.com/OpenGeoscience/uvdat/commit/2f3b671a2a84ffbbe0905a07c0988a6418bdbe67))

### Testing

- Try different docker compose action
  ([`05442e7`](https://github.com/OpenGeoscience/uvdat/commit/05442e783dfe91bc0353d718a5c13cc74a5ad674))


## v0.0.0 (2024-06-20)
