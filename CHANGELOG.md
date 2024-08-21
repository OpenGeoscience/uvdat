# CHANGELOG

## v0.3.0 (2024-08-21)

### Feature

* feat: Add import script to load county networks from exported geojson files ([`0bb90a4`](https://github.com/OpenGeoscience/uvdat/commit/0bb90a432686168797fbde5c5a4f3ba935208027))

### Fix

* fix: remove unintentional quotes ([`296dc78`](https://github.com/OpenGeoscience/uvdat/commit/296dc7865d37dc0bbed1e0838e29a6df31793589))

* fix: filter properties upon import (key and value must exist) ([`e2c7549`](https://github.com/OpenGeoscience/uvdat/commit/e2c754949ff2ca66e7b67bdca4c9fb55f4aadbcb))

* fix: remove other usages of module reference for nysdp datasets ([`ee55020`](https://github.com/OpenGeoscience/uvdat/commit/ee550201c20bd724d02a7d736a8807d88afb001b))

* fix: ingest contexts before charts ([`df98b5d`](https://github.com/OpenGeoscience/uvdat/commit/df98b5d72ac16471c55127e58327d1b587089276))

* fix: `network.dataset` -&gt; `dataset` ([`f859588`](https://github.com/OpenGeoscience/uvdat/commit/f859588f1e5d4142dec8c2c40db4974757ed48f4))

* fix: only delete old map layers at beginning of dataset ingest ([`d71c90a`](https://github.com/OpenGeoscience/uvdat/commit/d71c90a73d9ff28ab4adddfc2f5478bf01efa904))

* fix: Small bug fixes ([`478f58a`](https://github.com/OpenGeoscience/uvdat/commit/478f58a1f2d2e2b757a4058e4a14679e7ee7203a))

* fix: Improve speed and accuracy of network interpretation algorithm ([`29650e7`](https://github.com/OpenGeoscience/uvdat/commit/29650e70397b367d066e23e575441330b31368f5))

### Refactor

* refactor: Rename `vector_features_from_network` -&gt; `create_vector_features_from_network` ([`a287c78`](https://github.com/OpenGeoscience/uvdat/commit/a287c78f0ba11aa945792c39899a94955b66fa67))

* refactor: create ingest modules with `convert_dataset` function for each use case ([`48a769d`](https://github.com/OpenGeoscience/uvdat/commit/48a769d0511dee3dbf929b779ca198885d00b15c))

* refactor: remove unnecessary string casting ([`fb2cb07`](https://github.com/OpenGeoscience/uvdat/commit/fb2cb073be55d6fd22e78376fc22978efc660c60))

### Style

* style: Additional style fixes ([`3f18006`](https://github.com/OpenGeoscience/uvdat/commit/3f180067ba6ee44ff9c0f7a9d6ac06840180d09e))

* style: Reformat with tox ([`0f985c9`](https://github.com/OpenGeoscience/uvdat/commit/0f985c96452d0fa834b371f990b045af85e4d29c))

### Test

* test: adjust expected number of contexts in populate test ([`11c2c83`](https://github.com/OpenGeoscience/uvdat/commit/11c2c8315b49076709ab9bd46cdda90e549ab690))

### Unknown

* Merge pull request #45 from OpenGeoscience/use_cases

Add New York Energy use case to populate script ([`221fdf2`](https://github.com/OpenGeoscience/uvdat/commit/221fdf26e44e65a8514bee814de1562cb857517b))

* wip: interpret network from vector features ([`0257833`](https://github.com/OpenGeoscience/uvdat/commit/02578334512437121fcec1f27aeff45b00b2041c))

* Add a function to consolidate nysdp features ([`d499531`](https://github.com/OpenGeoscience/uvdat/commit/d4995314b02ff50b30cb633f4dca8dc09a9af0ed))

* Add module-based dataset loading ([`48e0a22`](https://github.com/OpenGeoscience/uvdat/commit/48e0a2249c8b4331f56d3b3c35a1561c4dbf023d))

* Reorganize sample_data folder to accomodate multiple use cases ([`cfa32a8`](https://github.com/OpenGeoscience/uvdat/commit/cfa32a87f5425578ba886540ad081391c797cdc7))

## v0.2.0 (2024-08-21)

### Feature

* feat: Add rest viewsets for file item and network models ([`53e54e5`](https://github.com/OpenGeoscience/uvdat/commit/53e54e5dfdb6c530f8238e7be671afb2dbcc13d0))

### Fix

* fix: remove old name reference ([`bfd69c2`](https://github.com/OpenGeoscience/uvdat/commit/bfd69c2f7fd8e16cd8e39424d03f22f72c21bc9f))

* fix: undo change to expected number of contexts ([`48fe642`](https://github.com/OpenGeoscience/uvdat/commit/48fe642555bbfe995f57151ccfe5a99ebdf6349e))

* fix: Small bug fixes ([`87279bc`](https://github.com/OpenGeoscience/uvdat/commit/87279bce6a19bec2f4979c7f381913734ad9d655))

### Refactor

* refactor: apply suggested changes ([`f50de69`](https://github.com/OpenGeoscience/uvdat/commit/f50de697a5dc8abb7e98b00d17b233cf69fa82a1))

### Style

* style: reformat with black ([`431537b`](https://github.com/OpenGeoscience/uvdat/commit/431537b5e495be578f2a30c588d3a893e7ac4413))

* style: Lint fixes ([`d7c6ef6`](https://github.com/OpenGeoscience/uvdat/commit/d7c6ef6f6bb2915305a495e649a07cf02456b1cc))

### Test

* test: Update OSMnx test expected number of nodes and edges ([`95c8c8a`](https://github.com/OpenGeoscience/uvdat/commit/95c8c8a729538bc515676c8600a35f28a2612dab))

### Unknown

* Merge pull request #46 from OpenGeoscience/model-changes

Networks &amp; File Items ([`79e6ca7`](https://github.com/OpenGeoscience/uvdat/commit/79e6ca7b145a6e2477fcac210fba5f59ae94a0d8))

* Add Network model; allow multiple networks on a single dataset ([`6e0e132`](https://github.com/OpenGeoscience/uvdat/commit/6e0e132d5024518e99c462df4aac286f3c8f68d0))

* Make file_item relation optional (a MapLayer can exist on a Dataset without a FileItem) ([`4c480f6`](https://github.com/OpenGeoscience/uvdat/commit/4c480f60aae3a93332b23ae65d890f2bf82adbc1))

## v0.1.0 (2024-08-19)

### Feature

* feat: pin dependency versions in `setup.py` ([`2f3b671`](https://github.com/OpenGeoscience/uvdat/commit/2f3b671a2a84ffbbe0905a07c0988a6418bdbe67))

### Test

* test: try different docker compose action ([`05442e7`](https://github.com/OpenGeoscience/uvdat/commit/05442e783dfe91bc0353d718a5c13cc74a5ad674))

### Unknown

* Merge pull request #47 from OpenGeoscience/freeze-deps

Pin dependency versions ([`c40ca74`](https://github.com/OpenGeoscience/uvdat/commit/c40ca74b1c0a2de6c6f37bdf48760d3edd828b71))

* Merge pull request #48 from OpenGeoscience/ci-action

Change docker compose GH Action ([`f6f7e57`](https://github.com/OpenGeoscience/uvdat/commit/f6f7e5763f23ff91139c9de69c1ce0d5d4f59c22))

* Merge pull request #38 from OpenGeoscience/osmnx-roads

Add endpoint to pull road network from osmnx ([`fbda461`](https://github.com/OpenGeoscience/uvdat/commit/fbda461c94a55202f3b178b1add38cfc3189500d))

* Reorder imports in `osmnx.py` ([`8721125`](https://github.com/OpenGeoscience/uvdat/commit/8721125536cbbcf8b75a01c21e4e05c3973365a4))

* Implement as both REST endpoint and management command ([`8378cc1`](https://github.com/OpenGeoscience/uvdat/commit/8378cc113d1bc170f6ce62df2190fe8a993511f7))

* Rebase migrations ([`96e3167`](https://github.com/OpenGeoscience/uvdat/commit/96e316783c1f5f40ce4096e9651b61e56323277e))

* Remove edge name duplicate logic ([`cf81818`](https://github.com/OpenGeoscience/uvdat/commit/cf8181831e982d055e4b81d5829834a6a32c51d7))

* Apply style changes ([`713d421`](https://github.com/OpenGeoscience/uvdat/commit/713d421e931f772874481ece4a22da24046de423))

* Move load_roads to an API endpoint on the Context model ([`4dc8082`](https://github.com/OpenGeoscience/uvdat/commit/4dc80823d081ffcfa1f7fc9e6155f455976d8c9b))

* Add osmnx cache folder to gitignore ([`903d5b0`](https://github.com/OpenGeoscience/uvdat/commit/903d5b04ba3ab5fcca924742a78d20bd76b6b0cc))

* Allow duplicate node/edge names (same roads can exist in multiple cities) ([`fe464bf`](https://github.com/OpenGeoscience/uvdat/commit/fe464bfebbaab82507f24cf5e856c7301f36ce97))

* Add a management command to pull road network from osmnx ([`0c29401`](https://github.com/OpenGeoscience/uvdat/commit/0c294012998142af2fbfd71b3746b24d213327a8))

* Merge pull request #43 from OpenGeoscience/postgis-vector-tiles

Generate vector tiles dynamically from extracted features ([`a85b7d1`](https://github.com/OpenGeoscience/uvdat/commit/a85b7d1e891c65c48db869fb88b22f5e4233d070))

* Fix import formatting ([`d88e5ce`](https://github.com/OpenGeoscience/uvdat/commit/d88e5ceba31eba3b2493b1f9dd3adaa41027bf45))

* Fix type inconsistencies ([`0bf5975`](https://github.com/OpenGeoscience/uvdat/commit/0bf59753fb4f94b648a1d524e1faca3695ccb672))

* Save vector features after map layer modification ([`714187d`](https://github.com/OpenGeoscience/uvdat/commit/714187d72ddd5e0117153d3a334a1e23041f53e8))

* Add admin class for VectorFeature ([`bab350a`](https://github.com/OpenGeoscience/uvdat/commit/bab350a841db2ded8ab3ee1b7a744cae51de949e))

* Fix vector feature imports ([`dce8516`](https://github.com/OpenGeoscience/uvdat/commit/dce851636f4173021f54263947b4a52f297cc066))

* Move save_vector_features to create_vector_map_layer ([`d854226`](https://github.com/OpenGeoscience/uvdat/commit/d854226069a55c55cb302e54214a426b2deb9615))

* Squash migrations ([`25ce2b7`](https://github.com/OpenGeoscience/uvdat/commit/25ce2b7d0a990b8dc1a64202e977cfe7132356aa))

* Remove VectorTile and use of tile_extents ([`d4041cf`](https://github.com/OpenGeoscience/uvdat/commit/d4041cf76e002769f1ffaca8f70635ce846b3b6a))

* Remove use of OL tileUrlFunction ([`41e6bc5`](https://github.com/OpenGeoscience/uvdat/commit/41e6bc5c4f4aec9f8672535525a99dab4f08f0b7))

* Generate vector tiles dynamically from extracted features ([`90bd64f`](https://github.com/OpenGeoscience/uvdat/commit/90bd64f61e001f17cce2194cf041a906d9b51360))

## v0.0.0 (2024-06-20)

### Unknown

* Merge pull request #40 from OpenGeoscience/publish-docker-images

Publishing server code as Docker image ([`bca73f4`](https://github.com/OpenGeoscience/uvdat/commit/bca73f45874b41e9695876180684be7a739191a7))

* Add python semantic versioning step to generate tag for image ([`52ba359`](https://github.com/OpenGeoscience/uvdat/commit/52ba359fb4ae0a8c1a551f1123d287bbfeb2f3bd))

* Prepend tag with registry URL ([`2546276`](https://github.com/OpenGeoscience/uvdat/commit/25462766a452cb3c5929c952c6615848717a15b6))

* Modify image name (must be all lowercase) ([`bf55c7b`](https://github.com/OpenGeoscience/uvdat/commit/bf55c7b039b8018769041b5b32b7cfa76d1b5422))

* Modify Dockerfile for portability and add publishing workflow ([`46cd17f`](https://github.com/OpenGeoscience/uvdat/commit/46cd17fdd57336bb6517ffc30c3a0522b1cf0727))

* Merge pull request #37 from OpenGeoscience/update-readme

Create a docs folder and improve README ([`b371373`](https://github.com/OpenGeoscience/uvdat/commit/b371373c1f81ec56b868ff04e6d0d26215be05fa))

* Remove uvdat_flow image ([`3dbeb10`](https://github.com/OpenGeoscience/uvdat/commit/3dbeb102a3f77a454cbf1d0f92b7f5c63036ba1c))

* Fix typo in &#34;representations&#34; ([`1012c94`](https://github.com/OpenGeoscience/uvdat/commit/1012c949269aeaa0e1286b8b33cafd0ebc89f751))

* Replace &#34;Girder 4&#34; with &#34;Resonant&#34; in README ([`e1ec12d`](https://github.com/OpenGeoscience/uvdat/commit/e1ec12d5c10a1b4987b5ce008149acbb2077633f))

* Editorial changes

Signed-off-by: Anne Haley &lt;anne.haley@kitware.com&gt; ([`3a60b97`](https://github.com/OpenGeoscience/uvdat/commit/3a60b97b926eab960dac05f49ba5cf5c3a07018c))

* Add more links to README ([`a6835fb`](https://github.com/OpenGeoscience/uvdat/commit/a6835fb15afb19d585317129916a14d0a910e9f8))

* Add container around images for inline display ([`0c4e88c`](https://github.com/OpenGeoscience/uvdat/commit/0c4e88c0d372f04b2c0c7f2cc6950971e2af953d))

* Create a docs folder and improve README ([`4222b7b`](https://github.com/OpenGeoscience/uvdat/commit/4222b7b52ab5d90713a822d76592bbf5fd964b08))

* Merge pull request #42 from OpenGeoscience/dev-improvements

Dev improvements ([`ed7d9d9`](https://github.com/OpenGeoscience/uvdat/commit/ed7d9d95cba33e0dc476539c8e612c9829abb1a3))

* Add support for direnv ([`3edba6b`](https://github.com/OpenGeoscience/uvdat/commit/3edba6bf970e0d656e5742f1e621080c5cf20426))

* Use env vars for database connection info ([`81eaef9`](https://github.com/OpenGeoscience/uvdat/commit/81eaef92bcc2042e1e439a9bf8a8c0e24559b057))

* Add ruff config to pyproject.toml ([`328ef55`](https://github.com/OpenGeoscience/uvdat/commit/328ef556dd65e9d42f2d681ac48235a6ccd08892))

* Move heavy import to within function ([`e3c4443`](https://github.com/OpenGeoscience/uvdat/commit/e3c44438c39be0786827430f5dcc5446808ab0a1))

* Merge pull request #30 from OpenGeoscience/model-redesign

Model redesign ([`72000c2`](https://github.com/OpenGeoscience/uvdat/commit/72000c27c4f6eaae96ba9c2c7d60244800e53782))

* Fix layers edge case bugs ([`361ec2f`](https://github.com/OpenGeoscience/uvdat/commit/361ec2f756cb42ef5bcbbe03c5793ba279cbddec))

* Update behavior around availableDerivedRegions ([`0a2c9ca`](https://github.com/OpenGeoscience/uvdat/commit/0a2c9ca1952dbb9e056a6b317e7b4d576bce03f5))

* Use `selectedDerivedRegions` storage instead of `isDerivedRegionSelected` function ([`dfe4c74`](https://github.com/OpenGeoscience/uvdat/commit/dfe4c7412974a057a4acfaac94a7a624ae80bffc))

* Merge remote-tracking branch &#39;origin/master&#39; into model-redesign ([`6459e75`](https://github.com/OpenGeoscience/uvdat/commit/6459e753f0cbec9dba8773453cc3f0be77397aaa))

* Merge pull request #32 from OpenGeoscience/fix-active-layers ([`8a91613`](https://github.com/OpenGeoscience/uvdat/commit/8a916130c8c0044359b206ecd7e97737d40e3e1c))

* Add css rule to prevent checkbox label overflow ([`90be5c3`](https://github.com/OpenGeoscience/uvdat/commit/90be5c3dc53b3126fd6ec4fb04bd3ccb13b07d04))

* Fix raster slider and colormap behavior ([`dddefa1`](https://github.com/OpenGeoscience/uvdat/commit/dddefa17d68a5127f64b4ae30dd9af6e887fb3f8))

* Fix bug surrounding layer removal in options panel ([`02a2b90`](https://github.com/OpenGeoscience/uvdat/commit/02a2b900941d6a7442734132f6a9216bcfdbdaa7))

* Use computed getter/setter for vue-draggable ([`2d3c247`](https://github.com/OpenGeoscience/uvdat/commit/2d3c2475c3f0770aa02f6a26712e9661f63181ee))

* Merge pull request #33 from OpenGeoscience/ci-testing

Enable CI testing ([`a2026de`](https://github.com/OpenGeoscience/uvdat/commit/a2026dea0d82045f9cf2d96549c54c6c6a037d6a))

* Merge pull request #34 from OpenGeoscience/web-updates

Web updates ([`56eab4a`](https://github.com/OpenGeoscience/uvdat/commit/56eab4a93fa0e906fa5ac3b6bb74a909fa3eab71))

* Fix bug in getOrCreateLayerFromID ([`93ae876`](https://github.com/OpenGeoscience/uvdat/commit/93ae876435aa9f0a056b51275dffaff8b464880c))

* Merge pull request #35 from OpenGeoscience/web-updates-updates ([`52d8d4d`](https://github.com/OpenGeoscience/uvdat/commit/52d8d4dd5bfdce3babde454a00c69589924a2f1b))

* Add TODO ([`334b445`](https://github.com/OpenGeoscience/uvdat/commit/334b445d1201e1e3b4134d876ce457e50a7e781c))

* Fix reference to &#34;dataset&#34; object (instead of &#34;Dataset&#34; class) ([`1175a1b`](https://github.com/OpenGeoscience/uvdat/commit/1175a1b277492777e622e3381701ef0ce39c65c0))

* Use already-fetched map layers, consistent use of caching and types ([`3d4287f`](https://github.com/OpenGeoscience/uvdat/commit/3d4287f13ca924ae71c5339eee87ae87abe37d4d))

* Exclude &#34;Extended&#34; serializers from serializer matches in `get_available_simulations` ([`55fbff5`](https://github.com/OpenGeoscience/uvdat/commit/55fbff51af4286b5bd0fef34e075a0a4d1bb797c))

* Add TODO ([`4b62b03`](https://github.com/OpenGeoscience/uvdat/commit/4b62b0378487949fefcffbf1d15ca6473f93b1ea))

* Squash migrations into initial ([`4ab6137`](https://github.com/OpenGeoscience/uvdat/commit/4ab6137ead10e3189fc6ba5e09ff044c9c30012c))

* Fix linting ([`4e19483`](https://github.com/OpenGeoscience/uvdat/commit/4e19483ec37dfa8e39ce583275bfe3e65e013fb7))

* Retrieve map layers from dataset detail endpoint ([`f987749`](https://github.com/OpenGeoscience/uvdat/commit/f987749dae08302a70df3c4611d32e185498d5bf))

* Don&#39;t create local paths for service volumes ([`c96ff90`](https://github.com/OpenGeoscience/uvdat/commit/c96ff90eca962230d0bf0ad3be4de20abd0ebf7d))

* Fix type errors for AbstractLayer ([`0efeab8`](https://github.com/OpenGeoscience/uvdat/commit/0efeab880d5f5cca401e0b622bc45dbfab0989e2))

* Use tile extents instead of tile coords ([`a3df988`](https://github.com/OpenGeoscience/uvdat/commit/a3df9883616fb165108a73ec99eca8d59745691c))

* Add dataset classification ([`cef6f5e`](https://github.com/OpenGeoscience/uvdat/commit/cef6f5e941541559b1a45bce700d9afccbfb0397))

* Remove geojson_data JSONField, reorg geojson funcs ([`a088c52`](https://github.com/OpenGeoscience/uvdat/commit/a088c528becd18d34a8768773ced79f6601ea9ad))

* Add indexes and constraints to VectorTile ([`6acaaf6`](https://github.com/OpenGeoscience/uvdat/commit/6acaaf691709afbcccf185d2c56520886e122849))

* Fix applying zIndex when switching layers on the same Dataset ([`790e6df`](https://github.com/OpenGeoscience/uvdat/commit/790e6dfcf5d00a8098eb95523f4cdd67d0c39380))

* Add label to Context dropdown ([`34b79f3`](https://github.com/OpenGeoscience/uvdat/commit/34b79f39c3115db87bcf813250bcbf4f89ea8852))

* Allow user to apply style changes to all layers in Dataset ([`fb93dfd`](https://github.com/OpenGeoscience/uvdat/commit/fb93dfd30eb9c067ad17e2cb29a0c6ed5d9e307f))

* Switch order of populate script function calls (Datasets come first) ([`9d3f8c7`](https://github.com/OpenGeoscience/uvdat/commit/9d3f8c71cbba45da4d77ea5564c1701efcb6fdd1))

* Lint fixes ([`c20c94e`](https://github.com/OpenGeoscience/uvdat/commit/c20c94e5d1dc4b876030e2b57d8a7159b56c028f))

* Enable Derived Regions features ([`5431478`](https://github.com/OpenGeoscience/uvdat/commit/543147879ed36bc68e46169ec90b8d2d5b649974))

* Improve vector map layer styling to highlight GCC ([`eb1fe01`](https://github.com/OpenGeoscience/uvdat/commit/eb1fe01b1868c13ebd9f9e0bd2120a49c3909b3f))

* Enable Simulations features ([`f7bb553`](https://github.com/OpenGeoscience/uvdat/commit/f7bb553c2facca56a53dfdca3da4f3e93fadfdca))

* Esure context switching clears state and fetches new objects ([`632236a`](https://github.com/OpenGeoscience/uvdat/commit/632236a263c830c5156643aa60eec226110f2c93))

* More fixes for layer behavior ([`e6bd902`](https://github.com/OpenGeoscience/uvdat/commit/e6bd9022a5775d2a4ab1ac93a3d85ce2965f0482))

* Create slider for current map layer (shown for datasets where more than one map layer exists) ([`04966ab`](https://github.com/OpenGeoscience/uvdat/commit/04966ab7f4087853a1fb3d3f8dc2f296507debfd))

* Fix population of GCC chart ([`03ae6c3`](https://github.com/OpenGeoscience/uvdat/commit/03ae6c3bbcc80421eb7d1bae99c556f2385bd054))

* Fix web client build warnings related to versions ([`085d830`](https://github.com/OpenGeoscience/uvdat/commit/085d8305449c1bad89bf67547c3ab28298c6919b))

* Lint fixes ([`4b9a3b3`](https://github.com/OpenGeoscience/uvdat/commit/4b9a3b34c0c46f1b4cc73c8202a5a56716eb25de))

* Enable GCC features ([`8c13bd1`](https://github.com/OpenGeoscience/uvdat/commit/8c13bd12f854d6ecc079c6faf73b36ccbbcd0d66))

* More API changes ([`a574476`](https://github.com/OpenGeoscience/uvdat/commit/a574476db2dd9db377f7bc67a9d134953f6da549))

* Update conversion tasks for networks and regions ([`159b5b7`](https://github.com/OpenGeoscience/uvdat/commit/159b5b7d73f19b22658726b5df4c3952ff4dbd8d))

* Fix CI syntax ([`43f85be`](https://github.com/OpenGeoscience/uvdat/commit/43f85bed6e09af030b55717b309fc8e4d1d1c0ea))

* Merge changes from #32 ([`6128827`](https://github.com/OpenGeoscience/uvdat/commit/6128827f3127d23bf8351f2805857be807c85a2a))

* Other store typing changes ([`1ef509e`](https://github.com/OpenGeoscience/uvdat/commit/1ef509ea805b135ae22aa78e70ce6f9d3dba486a))

* Disable failure on warnings for lint-client ([`432828b`](https://github.com/OpenGeoscience/uvdat/commit/432828b7f9e0b750ac3bb652789d17dded11e8c8))

* Add a test for client lint/type ([`9f80c14`](https://github.com/OpenGeoscience/uvdat/commit/9f80c147a84cd2bf3a79a3f237e60886329d4ec6))

* Fix some typing ([`ad49ab1`](https://github.com/OpenGeoscience/uvdat/commit/ad49ab1cccae81bb7322c60adff4f30ecd3c4220))

* Fix some rest endpoints ([`9f17c5f`](https://github.com/OpenGeoscience/uvdat/commit/9f17c5fc24381f963560d85d92d1506ae1062625))

* Resolve import errors with consistent Vue setup structure ([`c0b6a8d`](https://github.com/OpenGeoscience/uvdat/commit/c0b6a8dd6a346f8cdda92efccabea81e7279ce64))

* City -&gt; Context ([`7fb50ea`](https://github.com/OpenGeoscience/uvdat/commit/7fb50eaebdbcd3879ae8afdcc72fa6d2e3b5dc34))

* Ensure large-image-converter is installed prior to pytest ([`1305b01`](https://github.com/OpenGeoscience/uvdat/commit/1305b018fc67a18abc62793027e4a2a0e0b9cb5a))

* Add populate test ([`f6789e2`](https://github.com/OpenGeoscience/uvdat/commit/f6789e24367abaa955a1994ed42bb495834b2cb6))

* Use repository link to install django-configurations, latest version
needed but not posted to PyPI yet ([`4c3917e`](https://github.com/OpenGeoscience/uvdat/commit/4c3917e8111e8f5f20661b23ceaea9247b836e95))

* Fix import of DerivedRegionCreationError (changed name for lint) ([`48dfb09`](https://github.com/OpenGeoscience/uvdat/commit/48dfb0909bba37ac77950141568e9716ab5b8f5f))

* Fix multi-container environment with compose action ([`a214b4f`](https://github.com/OpenGeoscience/uvdat/commit/a214b4fc2d4a0dbc797fbd8a6ef72938dd1d4a1b))

* Use native environment file for testing ([`ba68040`](https://github.com/OpenGeoscience/uvdat/commit/ba68040047f944cc91d1b064bac4fed73685cc17))

* More lint fixes ([`ea94851`](https://github.com/OpenGeoscience/uvdat/commit/ea94851cec7d70931607a7ad19f25bd7782001aa))

* Move env to run step for pytest &amp; check-migrations ([`9efb8e3`](https://github.com/OpenGeoscience/uvdat/commit/9efb8e30df248106fc2a2c08928e3a508fcd77ea))

* Fix linting ([`537153b`](https://github.com/OpenGeoscience/uvdat/commit/537153bfd308c4ace502ae89162f47aa158f660e))

* Call tox environments as separate CI steps ([`d0faf2f`](https://github.com/OpenGeoscience/uvdat/commit/d0faf2fbdd2265ff2bc93a7a1d07fe9834bf7407))

* Include population script successful output as txt file ([`384194e`](https://github.com/OpenGeoscience/uvdat/commit/384194e49dcdb990247bbeda37ef44f0d34c7ea0))

* Add more print statements for object creations ([`7597f1b`](https://github.com/OpenGeoscience/uvdat/commit/7597f1bd9eed7888cfe5c38fcf10c38b81ad1f25))

* Use S3FileField for large geojson data ([`08779f3`](https://github.com/OpenGeoscience/uvdat/commit/08779f308887d05165e8b12e36a80c23dc22b0d5))

* Rename &#34;Original&#34; to &#34;Source&#34; ([`edb1ada`](https://github.com/OpenGeoscience/uvdat/commit/edb1adae6f8998ddd0546f252c03ab290cd73778))

* Change Cities into Contexts ([`cfd6a07`](https://github.com/OpenGeoscience/uvdat/commit/cfd6a07675a13b7e5dc500c181dd0316dd711b86))

* Rename DataSources to MapLayers ([`87d8195`](https://github.com/OpenGeoscience/uvdat/commit/87d819566a53d246550b4b9bd012a9c1abca0f47))

* Update populate script and conversion tasks ([`bdcece6`](https://github.com/OpenGeoscience/uvdat/commit/bdcece69c8d3728bc8d6347252f3e0f437c027bf))

* Fix Chart-FileItem relationship ([`cd31d9e`](https://github.com/OpenGeoscience/uvdat/commit/cd31d9ed44a7931831970de895aaf4642f0a9215))

* Separate Charts from DataSources ([`1afb1f4`](https://github.com/OpenGeoscience/uvdat/commit/1afb1f4cddc9461594977d6ea956e9d262658852))

* Small changes to some fields ([`3e6b67f`](https://github.com/OpenGeoscience/uvdat/commit/3e6b67f84f49ae6c126218a9d3b3d907a9a81c98))

* Another design iteration ([`aaa1c7f`](https://github.com/OpenGeoscience/uvdat/commit/aaa1c7fa7fab9518d6daba57da7c1932245a6117))

* Various design changes ([`d28edfa`](https://github.com/OpenGeoscience/uvdat/commit/d28edfab1f62f0ba98a036b9f75473ec7fb31295))

* Update model references in tasks ([`acda2c3`](https://github.com/OpenGeoscience/uvdat/commit/acda2c3204e7be6a4110f4d670e17b41e1845eec))

* Update rest viewsets for new models ([`d894e77`](https://github.com/OpenGeoscience/uvdat/commit/d894e77c1695c3cfaf7f09b9faef13efebc008d3))

* Format new models files ([`3c74ab7`](https://github.com/OpenGeoscience/uvdat/commit/3c74ab7445fcd1e1ff91b078755dfb962f0edd92))

* Udate admin.py for new models ([`a22b715`](https://github.com/OpenGeoscience/uvdat/commit/a22b715dbf12b5b3c20acde82ebefc7d77cebdca))

* Start new migration history ([`27ecae0`](https://github.com/OpenGeoscience/uvdat/commit/27ecae09e26791c30776bf47758c0db4352dacc5))

* Use relative locations for docker volume mounts and fix tox ([`1cde6c9`](https://github.com/OpenGeoscience/uvdat/commit/1cde6c9e77fb9e8e4a9c9b8e2b8a72831fbf070e))

* Reorganize model definitions (first pass) ([`f6ee54c`](https://github.com/OpenGeoscience/uvdat/commit/f6ee54cd7e72bae1eeb3e3f02569360ce962d986))

* Merge pull request #29 from OpenGeoscience/pin-django-allauth ([`c4a93fd`](https://github.com/OpenGeoscience/uvdat/commit/c4a93fd212250b1728a1cf607a3de8a3faf7d7b2))

* Pin django-allauth to &lt;0.56.0 ([`026bb14`](https://github.com/OpenGeoscience/uvdat/commit/026bb141b5e333fdcb6c5c2d1c5c46df1b407a10))

* Merge pull request #19 from OpenGeoscience/region-operations ([`948f6ad`](https://github.com/OpenGeoscience/uvdat/commit/948f6ad6f7ebc3a2f136bb4c04d00884d9ae5dc1))

* Move save_regions function to new tasks/regions.py ([`41c944c`](https://github.com/OpenGeoscience/uvdat/commit/41c944c93119389f4ea2dcccfd05a726ba6ef1bc))

* Add same spacing to Region Grouping popup ([`37ddb33`](https://github.com/OpenGeoscience/uvdat/commit/37ddb3374668b75084553deb9d4278bf992271c7))

* Use attach prop on v-menu so it moves with activator (when main drawer opens/closes) ([`9f3a75c`](https://github.com/OpenGeoscience/uvdat/commit/9f3a75ca4b40ea9e8d8273ed0a8b3e4d86b401c2))

* Add icon tooltips, no layers text, and adjusted spacing for ActiveLayers component ([`f138a77`](https://github.com/OpenGeoscience/uvdat/commit/f138a77a779df189bdecef8757b78e68d94b8405))

* Use different components for layers and region overlays ([`052e16e`](https://github.com/OpenGeoscience/uvdat/commit/052e16e8d14124a3b2c1a5e576b481559b3c0b67))

* Show Active Layers as map overlay ([`b53f427`](https://github.com/OpenGeoscience/uvdat/commit/b53f427290b22727705e2b56845bd87edd5ae3a9))

* Factor out map tooltip and context overlay components ([`20d74f6`](https://github.com/OpenGeoscience/uvdat/commit/20d74f68eb25c508129b0b9145d9d609a388088d))

* Rename selectedDataSources to activeDataSources ([`22e49af`](https://github.com/OpenGeoscience/uvdat/commit/22e49afe464b28cb0a39167b26a5da7984b7011b))

* Move map component into sub folder ([`60c0ee1`](https://github.com/OpenGeoscience/uvdat/commit/60c0ee1582c4b2a426c8dfdc4bbf39aa665327c3))

* Move derived region creation logic into new function ([`f73ee88`](https://github.com/OpenGeoscience/uvdat/commit/f73ee88ecf8d32fe7d6b95c86ee6a729ddce9615))

* Move RegionFeatureCollectionSerializer to serializers file ([`e7f2c52`](https://github.com/OpenGeoscience/uvdat/commit/e7f2c521340a04efa56dc7840e337a80ad1cf713))

* Use id instead of pk for regions ([`8122b0c`](https://github.com/OpenGeoscience/uvdat/commit/8122b0c4f38464ab6a40c252c27e11b968b3c138))

* Fix opacity state persistence ([`a574b1e`](https://github.com/OpenGeoscience/uvdat/commit/a574b1e117e95988878e38581d29d2af67311866))

* Fix dataset sidebar selection logic ([`1460913`](https://github.com/OpenGeoscience/uvdat/commit/146091311b050491f7227e3bfb6e266b627b3209))

* Only render dataset with VectorTileLayer if vector_tiles_file is present ([`b05fa74`](https://github.com/OpenGeoscience/uvdat/commit/b05fa741bf507389e82202d118c6819f1ba77457))

* Open datasets panel by default ([`6352c3a`](https://github.com/OpenGeoscience/uvdat/commit/6352c3a358d79f19b8ae3a4b4372f718fe3dfc31))

* Add text to derived region tooltip ([`6e3cd44`](https://github.com/OpenGeoscience/uvdat/commit/6e3cd4461be78f95252690b835f4554e07242868))

* Re-organize layer creation logic ([`0de281e`](https://github.com/OpenGeoscience/uvdat/commit/0de281e8e62be2f8712a40d12f6681ff01c4618a))

* Fix network node visualization ([`ae13be6`](https://github.com/OpenGeoscience/uvdat/commit/ae13be643b115cfcd6ecf8bb17d9fca9085c6c5f))

* Randomly color derived regions ([`3760928`](https://github.com/OpenGeoscience/uvdat/commit/37609289985ef5d539f6257ec333d0b7e8b1305f))

* Return feature instead of geometry from derived region endpoint ([`33720ed`](https://github.com/OpenGeoscience/uvdat/commit/33720edbf6815030aebe4d7926669407631e99b1))

* Fix bug in derived region creation view ([`f1e5118`](https://github.com/OpenGeoscience/uvdat/commit/f1e5118214001ad00fe248bddeb52f9d094b934e))

* Use class getters on MapDataSource ([`37d2b4a`](https://github.com/OpenGeoscience/uvdat/commit/37d2b4a99ec64453e8c6df31d3cac4f383a907f8))

* Add type info to map ([`f587ad4`](https://github.com/OpenGeoscience/uvdat/commit/f587ad43599494378e0dde61114c4d6dd89051d6))

* Remove use of selectedDataSourceIds ([`bb4f2b1`](https://github.com/OpenGeoscience/uvdat/commit/bb4f2b1cdc82e88aa6afef21346cb084d10dc079))

* Remove use of selectedDatasetIds ([`929a822`](https://github.com/OpenGeoscience/uvdat/commit/929a822e3a93ac15654f6ae85b675c95419a3831))

* Move functions into layers.ts and data.ts ([`3c6cff3`](https://github.com/OpenGeoscience/uvdat/commit/3c6cff3a2deac58ff2606347c4a108b44b7d68e4))

* Integrate MapDataSources ([`28ba070`](https://github.com/OpenGeoscience/uvdat/commit/28ba070eea998b0aac566790bad916b6ac26e5d4))

* Replace currentDataset with currentMapDataSource ([`3b4980f`](https://github.com/OpenGeoscience/uvdat/commit/3b4980f676db0aaeee545a1c0f4c08c824c4690c))

* Fix derived region panel reactivity ([`fab0b51`](https://github.com/OpenGeoscience/uvdat/commit/fab0b51158030ed7e22e8f54f327ac0061cf6ed9))

* Use sets for selected regions and datasets ([`f7410a8`](https://github.com/OpenGeoscience/uvdat/commit/f7410a82a47e68d33370306e9afeecab480cb635))

* Ensure active layers panel opens properly ([`2711122`](https://github.com/OpenGeoscience/uvdat/commit/271112277ba2021b943f500b1c2898a879581d89))

* Add viewing of derived regions ([`dbaa3db`](https://github.com/OpenGeoscience/uvdat/commit/dbaa3db702346bca3fb82f8a5cf26da2dfbdeda9))

* Add derived_region method for openlayers ([`b882009`](https://github.com/OpenGeoscience/uvdat/commit/b882009dae565933d4cedda09f2b72e7e4d8536f))

* Add UI methods for creating and listing derived regions ([`63be3c4`](https://github.com/OpenGeoscience/uvdat/commit/63be3c4716e0f124154eae5119b7d2306d82bb53))

* Add API endpoint for creating derived regions ([`c5daf81`](https://github.com/OpenGeoscience/uvdat/commit/c5daf81ea98f5ee513c058c3df6455f762c51d0b))

* Ensure features are correctly handled when selecting datasets ([`0782e1c`](https://github.com/OpenGeoscience/uvdat/commit/0782e1c1e343caa1b8f08a6a7f5537d8c9d0d276))

* Serialize region pk as number in feature collection ([`70856eb`](https://github.com/OpenGeoscience/uvdat/commit/70856ebcef8b8fc86072e09a059343a6f4ef505a))

* Move network tooltip rendering into OpenLayersMap component ([`65698c0`](https://github.com/OpenGeoscience/uvdat/commit/65698c00a5ebcb5493bb51000eb4dd2355f08e11))

* Render map tooltip using vue

Render the map tooltip through vue templating, instead of dynamic dom element generation. ([`934320d`](https://github.com/OpenGeoscience/uvdat/commit/934320d885086f896d6a3e6428449185ea815b7c))

* Add boston zip codes dataset ([`c29a558`](https://github.com/OpenGeoscience/uvdat/commit/c29a55826e5fd8c7ddb654b8c26e0efa587660f5))

* Add boston census 2020 block groups dataset ([`153c5e3`](https://github.com/OpenGeoscience/uvdat/commit/153c5e312ee2368c4b76c023cb130a5996278213))

* Generalize save_regions func ([`c178426`](https://github.com/OpenGeoscience/uvdat/commit/c17842672eb637811093d498d141d35c9e11f98c))

* Add DerivedRegions, region constraints ([`cb67764`](https://github.com/OpenGeoscience/uvdat/commit/cb67764a0af4c51e872a81037fa3e98560ef2a55))

* Merge pull request #23 from OpenGeoscience/recovery-sim

Recovery simulations ([`7f798ac`](https://github.com/OpenGeoscience/uvdat/commit/7f798ac40f2f1c301a2b01c92f67b3375820927c))

* Remove redundant cast to int

Suggested by @AlmightyYakob

Co-authored-by: Jacob Nesbitt &lt;jjnesbitt2@gmail.com&gt; ([`08bbc1c`](https://github.com/OpenGeoscience/uvdat/commit/08bbc1c29982d0fc8e95969fd1d8b2c2e0f4aead))

* Optimize construct_edge_list ([`476273f`](https://github.com/OpenGeoscience/uvdat/commit/476273f23864859f4140e599eda42bf9366a0008))

* Implement other recovery modes with Jack&#39;s centrality measures function ([`c48ad15`](https://github.com/OpenGeoscience/uvdat/commit/c48ad159cc3eae913acf75b10a110b724e4c2892))

* Update Node Animation component ([`fea8537`](https://github.com/OpenGeoscience/uvdat/commit/fea8537bfdc760a4282f73974804c39c895b55c0))

* Abstract Simulation Result display for compatibility with new Simulation type ([`9903f87`](https://github.com/OpenGeoscience/uvdat/commit/9903f876bc4ec5d8a53e6595d7d30824746c2533))

* Add a Simulation type for recovery scenarios, implement random only ([`7c5e14c`](https://github.com/OpenGeoscience/uvdat/commit/7c5e14c84e1ba353dc1996c33bd00291abbf6781))

* Merge pull request #20 from OpenGeoscience/simulations-pane

Simulations pane ([`d7ecc06`](https://github.com/OpenGeoscience/uvdat/commit/d7ecc0671b34861a35e88140c2d0abfbd5cd6873))

* Use UniqueConstraint instead of unique_together ([`c992c06`](https://github.com/OpenGeoscience/uvdat/commit/c992c067515f0fc9ca009ff08aca34a2cf360f90))

* Require network mode enabled  for network failure animation ([`c1c5661`](https://github.com/OpenGeoscience/uvdat/commit/c1c5661ef927ed498067a207b8ad866cd4a17f0b))

* Add City reference on Simulation Results ([`1cd52b8`](https://github.com/OpenGeoscience/uvdat/commit/1cd52b8cdcc5bfd926b3bc6ea54dd73645f3053f))

* Don&#39;t overwrite other rest framework defaults ([`6cf524a`](https://github.com/OpenGeoscience/uvdat/commit/6cf524a74e89cdff0b2533a3c72680507bad2120))

* Constrain simulation_id and input_args as unique together ([`3f60dd8`](https://github.com/OpenGeoscience/uvdat/commit/3f60dd857b841d2e80a3bb37dcf2f42f4d68ee16))

* Add error message to SimulationResult, add input checking ([`9fb1640`](https://github.com/OpenGeoscience/uvdat/commit/9fb16402df97c2f1cd69d6eb0d41485d12bd4165))

* Remove redundant model inheritance ([`d58061d`](https://github.com/OpenGeoscience/uvdat/commit/d58061d61eb2d7b933b586658ab20681f3c78828))

* Don&#39;t redraw network layer until new gcc is received (avoid flickering) ([`9814351`](https://github.com/OpenGeoscience/uvdat/commit/9814351755bce02b14e7376c855b86e36197cc86))

* Add Node Failure Animation component ([`9e27e03`](https://github.com/OpenGeoscience/uvdat/commit/9e27e0322fa1fba5445be78f1d0edaa1d375562d))

* Fill simulation function ([`9202e6f`](https://github.com/OpenGeoscience/uvdat/commit/9202e6f061d61fcd1fa27dd5f3e5703294990aff))

* Improve appearance of items in Active Layers ([`d5652cc`](https://github.com/OpenGeoscience/uvdat/commit/d5652cc9db1861c300137f0878aca374c0b8eb41))

* Show existing SimulationResult objects and their input args ([`dad8382`](https://github.com/OpenGeoscience/uvdat/commit/dad8382de708a58bdd5e5c6a17fcfc10ae2cb65c))

* Get SimulationResult objects related to a simulation type ([`07c3d15`](https://github.com/OpenGeoscience/uvdat/commit/07c3d1565fb5188d316e0c77d5c19b25f54e3e16))

* Upgrade dependencies to eliminate errors from vuetify ([`deb898b`](https://github.com/OpenGeoscience/uvdat/commit/deb898b0baeb222dacd1f61b1ca877238732f01e))

* Add SimulationResult model ([`7acf2c4`](https://github.com/OpenGeoscience/uvdat/commit/7acf2c4d62553ab0b4455fb347f4362f44af100e))

* Add client POST requests functions ([`e5e0717`](https://github.com/OpenGeoscience/uvdat/commit/e5e071759232ea485325b4d3d10c583116c2b05e))

* Add Simulations panel to select inputs for run ([`6d089f5`](https://github.com/OpenGeoscience/uvdat/commit/6d089f5c94620d5bbe3da24431c3a905ce979584))

* Add POST endpoint to run simulation ([`615e524`](https://github.com/OpenGeoscience/uvdat/commit/615e52414b3d22fcf0b0ab52f10e23eced94feef))

* Allow POST requests without authentication (Phase 1 solution only) ([`65bbde1`](https://github.com/OpenGeoscience/uvdat/commit/65bbde141a5331389d09a5aa0d47615343071704))

* Fix simulation arg options in request response ([`b8c761e`](https://github.com/OpenGeoscience/uvdat/commit/b8c761ea27a94a28fdda732ea3385aa26c32170e))

* Clear error message on a successful request ([`f21d33f`](https://github.com/OpenGeoscience/uvdat/commit/f21d33f3918c420ef2d0b63bd7b7be768743f994))

* Remove console log ([`45470b8`](https://github.com/OpenGeoscience/uvdat/commit/45470b8a510e6d80d2035c0ab1d8500b75978104))

* Add refresh button to Available Datasets panel and reorder panels (follow panel pattern) ([`b85f928`](https://github.com/OpenGeoscience/uvdat/commit/b85f92811e264bce78f1dd21743940a4c81afa22))

* Add available simulations list to UI ([`e7e0a2d`](https://github.com/OpenGeoscience/uvdat/commit/e7e0a2d9541ec72a3c80e0585425203aa75cdcc1))

* Add backend simulations viewset and tasks ([`a4da097`](https://github.com/OpenGeoscience/uvdat/commit/a4da09784800667cd3445ad0d1a2736a6d75104e))

* Merge pull request #17 from OpenGeoscience/flood-areas

Add flood datasets ([`f092580`](https://github.com/OpenGeoscience/uvdat/commit/f09258039a098316d28d3182e8444343d029c40d))

* Fix conversion of large flood map by increasing size limit ([`6de5b7d`](https://github.com/OpenGeoscience/uvdat/commit/6de5b7d4c19808a664cf8a659e2677f7a651e4d4))

* Fix wrong field name ([`19bff8f`](https://github.com/OpenGeoscience/uvdat/commit/19bff8f6b82b18fc001cfd336cf368dff3ed0b7b))

* Only use vector tiles on large datasets, use normal vector data otherwise ([`04b1c7f`](https://github.com/OpenGeoscience/uvdat/commit/04b1c7f6c679825935552981dcf1b429c2c399bb))

* Add flood datasets ([`ac72025`](https://github.com/OpenGeoscience/uvdat/commit/ac72025e84ca7aba589282cc99d5c4be3c996f38))

* Merge pull request #15 from OpenGeoscience/layers

Layer Visibility Logic ([`812f3dd`](https://github.com/OpenGeoscience/uvdat/commit/812f3dd5f31ef0819dc06d3a08fe896c43b5b88f))

* Fix layer update logic ([`1314eb5`](https://github.com/OpenGeoscience/uvdat/commit/1314eb5bb4c63d3d7c5c39fc3ff7a847e915ddd8))

* Fix undefined network.value case in Options Drawer ([`c529d2a`](https://github.com/OpenGeoscience/uvdat/commit/c529d2ad346c088e3567f534987acec5b5341db5))

* Fix bug noted by @johnkit ([`fbaeb23`](https://github.com/OpenGeoscience/uvdat/commit/fbaeb23a3641967a8de5d6dc62e9a0dea6842b55))

* Fix get z index; prevent layer reordering ([`547efe2`](https://github.com/OpenGeoscience/uvdat/commit/547efe2d7536fe3bcb38469a89d74287058ef435))

* Remove console log ([`98fa3ca`](https://github.com/OpenGeoscience/uvdat/commit/98fa3ca84794cbd7e33a2815756367c4ebd9fe96))

* Clear raster tooltip on change current Dataset ([`8422f96`](https://github.com/OpenGeoscience/uvdat/commit/8422f9667408c2e14cdf236cdbaf8b419fb386e3))

* Fix bug noted by @AlmightyYakob ([`5977575`](https://github.com/OpenGeoscience/uvdat/commit/597757570f9ddcccc5c068fe16b54f3bf3930d1f))

* Fix layer visibility logic ([`5c9f289`](https://github.com/OpenGeoscience/uvdat/commit/5c9f289a184f055a187593b6839085f12623c288))

* Add an icon button to show/hide map base layer ([`28a4c13`](https://github.com/OpenGeoscience/uvdat/commit/28a4c13c3eede3e66f4ae0aab6c1ce2cb0da3ddc))

* Consolidate layer visibility logic to one utils function ([`33878c1`](https://github.com/OpenGeoscience/uvdat/commit/33878c10650cbde7f22eeb9b9017f4a1171eda35))

* Merge pull request #13 from OpenGeoscience/charts

Charts ([`9548d73`](https://github.com/OpenGeoscience/uvdat/commit/9548d736f0b8b1a9bd923c1d0fcfc46a9f594390))

* Fix refresh charts button propagation ([`5d43f9a`](https://github.com/OpenGeoscience/uvdat/commit/5d43f9adba4055b3bfcfacd7a16550180ae36254))

* Move refresh charts icon button ([`362b759`](https://github.com/OpenGeoscience/uvdat/commit/362b7599b6cb4d229b1dd677c00ba3dcbb6d41ec))

* Change parent classes of ChartViewSet ([`62e167b`](https://github.com/OpenGeoscience/uvdat/commit/62e167b86a343b3a6f1ea87efdd2c60811c02213))

* Allow user to clear data from charts where clearable=True ([`9993789`](https://github.com/OpenGeoscience/uvdat/commit/9993789a730106c22e6c1454287c2e95346a9b0a))

* Create charts viewset and clear endpoint ([`432e22f`](https://github.com/OpenGeoscience/uvdat/commit/432e22f0f1c6595fbee286158a24a50d3acac312))

* Add field clearable to Chart model ([`b0884d7`](https://github.com/OpenGeoscience/uvdat/commit/b0884d73d97197666059842d5cefc3b074a674e6))

* Add download button for chart data ([`f72ea6d`](https://github.com/OpenGeoscience/uvdat/commit/f72ea6d5fb9d9f6cd8141288e718d6f15d601e42))

* GCC chart - use fixed y range and don&#39;t use temporal resets ([`b78f124`](https://github.com/OpenGeoscience/uvdat/commit/b78f12447f653bdf35925e6290d28f3e99798a71))

* Minor client fixes ([`d9e9df8`](https://github.com/OpenGeoscience/uvdat/commit/d9e9df824bc91a8f867833086c5c1a9f66e526c1))

* Change GCC chart algorithm ([`d43473c`](https://github.com/OpenGeoscience/uvdat/commit/d43473c04a1d7a5a125c50c782dad8baf286a124))

* Fix formatting ([`583f111`](https://github.com/OpenGeoscience/uvdat/commit/583f111061f042c55144e1a96cbddfec5a807012))

* Add chart options to Chart model ([`c05c6d4`](https://github.com/OpenGeoscience/uvdat/commit/c05c6d4fba5c6a26fe7ce34f94a4fab7d566cc72))

* Show chart title and axis labels ([`a7e05ab`](https://github.com/OpenGeoscience/uvdat/commit/a7e05ab831ec2e196cc2d577189116cf495fb307))

* Update charts after GCC change ([`5e56758`](https://github.com/OpenGeoscience/uvdat/commit/5e56758e0753c3d62bcbaf6b85c66a72a48db34a))

* Move chart display over map instead of in a tab ([`a6a0df5`](https://github.com/OpenGeoscience/uvdat/commit/a6a0df5037d47ee87710dceb9d61d3ff34b13e1b))

* Fix layer bug making map disappear ([`503317e`](https://github.com/OpenGeoscience/uvdat/commit/503317e436ab6ad5f4fea07abdc8856a9ef73a0a))

* Merge branch &#39;regions&#39; into charts ([`afab630`](https://github.com/OpenGeoscience/uvdat/commit/afab6307836190d42a60a3faf5ed61cd95da1d09))

* Make metadata display table recursive for nested objects ([`e204702`](https://github.com/OpenGeoscience/uvdat/commit/e204702af394eba922da0635dd59ab682146e245))

* Add gcc charts ([`5e32289`](https://github.com/OpenGeoscience/uvdat/commit/5e32289e61e06e447c8272f407c986483bdd93ed))

* Add metadata expansion panel ([`b216146`](https://github.com/OpenGeoscience/uvdat/commit/b216146eed326752de83e993d0c8b0722ccf3edf))

* Replace x range slider with number inputs ([`bdde335`](https://github.com/OpenGeoscience/uvdat/commit/bdde3357c411982d5cfe0772d3df85814f9760c3))

* Separate Charts from Datasets ([`7e9064b`](https://github.com/OpenGeoscience/uvdat/commit/7e9064b4de1c394a2c530523aa0179d92bfe63f6))

* Allow user to crop chart to x range ([`dbbc819`](https://github.com/OpenGeoscience/uvdat/commit/dbbc819314cb1df3ba682dcfacf1a3b3fddf25e9))

* Add a chart view mode to UI and use Vue-ChartJS to show selected chart data ([`aa7e147`](https://github.com/OpenGeoscience/uvdat/commit/aa7e14770affb8765b8b46c96704f906166716de))

* Add a chart model and save a chart from tide level dataset ([`3315967`](https://github.com/OpenGeoscience/uvdat/commit/33159670c7982bdeb36c7a7fa391a37956b11e0b))

* Merge pull request #12 from OpenGeoscience/regions ([`be9fc48`](https://github.com/OpenGeoscience/uvdat/commit/be9fc483d6768a8cfcfbd0fc11e49905bf61843f))

* Refactor displayFeatureTooltip to include regions ([`6c8584f`](https://github.com/OpenGeoscience/uvdat/commit/6c8584f910f7ec955d6d5175f7bb17af197a4496))

* Fetch regions directly instead of using vector tiles ([`9aebd8d`](https://github.com/OpenGeoscience/uvdat/commit/9aebd8d89b5b80ad4479aacfed4a445d7f05c729))

* Add &#34;Zoom to Region&#34; button to map tooltip ([`090243c`](https://github.com/OpenGeoscience/uvdat/commit/090243c25fdae36bc9c6eb107a74537cc91cea56))

* Reformat displayFeatureTooltip function ([`50aa728`](https://github.com/OpenGeoscience/uvdat/commit/50aa728349c2d59249e517b4b7440859ee981c6e))

* Save regions task ([`9975841`](https://github.com/OpenGeoscience/uvdat/commit/9975841b45970a7183b641c17e46d2fd27e95d00))

* Adjust style of blocks dataset ([`d814ae5`](https://github.com/OpenGeoscience/uvdat/commit/d814ae5afc399c363848822ceaa8765aa0f1f615))

* Add Region model ([`83ba67d`](https://github.com/OpenGeoscience/uvdat/commit/83ba67dbf57b32143e7bf06a3b96f16f08a96b39))

* Merge pull request #11 from OpenGeoscience/raster-tooltip

UI updates ([`28b4a53`](https://github.com/OpenGeoscience/uvdat/commit/28b4a537c5a32a0df6da11f681ff44468f910f09))

* Remove print statements ([`609599b`](https://github.com/OpenGeoscience/uvdat/commit/609599b015e307ed0eb7f78c9ecaf4d57576001d))

* Complete raster values tooltip ([`762ac7e`](https://github.com/OpenGeoscience/uvdat/commit/762ac7eab9c7ecf7d06acd67be2a6250ddf4c1ba))

* Add endpoint to get raster data at any resolution ([`4d5b095`](https://github.com/OpenGeoscience/uvdat/commit/4d5b0958c2bbe6a49a4ab0c84b09af761a24166b))

* Options panel on the right ([`e24bcb8`](https://github.com/OpenGeoscience/uvdat/commit/e24bcb84aa3208dc713bbff8261ccb0219e11c2f))

* Group available layers by category ([`cdbe9d8`](https://github.com/OpenGeoscience/uvdat/commit/cdbe9d85f7d18121c843cab05e9ded6a0c0140b3))

* Merge pull request #10 from OpenGeoscience/deactivate-nodes

Deactivate nodes ([`6b7f741`](https://github.com/OpenGeoscience/uvdat/commit/6b7f74184be2725b87cd1a71f650f682b5c9f84e))

* Show GCC when deactivated nodes list changes ([`2b2b4fd`](https://github.com/OpenGeoscience/uvdat/commit/2b2b4fdac959c26ac78878c4b8ec41fcbee90576))

* Fix feature display bugs ([`a51fe32`](https://github.com/OpenGeoscience/uvdat/commit/a51fe32faae715b156fd5d5899d97cd7c150bede))

* Allow user to deactivate nodes ([`3ace365`](https://github.com/OpenGeoscience/uvdat/commit/3ace365268d2dd19d29f10b97fe987218bd48a4d))

* Merge branch &#39;raster-tooltip&#39; into deactivate-nodes ([`c1ea7cb`](https://github.com/OpenGeoscience/uvdat/commit/c1ea7cb7c1d7823b568af43c0181e108eae32bc4))

* Create a separate tooltip function called when raster tooltip is enabled ([`3b40787`](https://github.com/OpenGeoscience/uvdat/commit/3b40787d2828b83fbce4fa14a4741d7147660c1b))

* Fill in network_gcc method ([`df17fde`](https://github.com/OpenGeoscience/uvdat/commit/df17fde490149a3869021986678309d7f6a185af))

* Merge pull request #9 from OpenGeoscience/city-blocks

City blocks dataset ([`191360a`](https://github.com/OpenGeoscience/uvdat/commit/191360a2d14b28d936a199fff9604d22bc7d99bc))

* Fix some styling bugs ([`36b2d68`](https://github.com/OpenGeoscience/uvdat/commit/36b2d6808aaf3ccb22cb1c4c4d7f3a183dd16e82))

* Add styling to color blocks ([`3179555`](https://github.com/OpenGeoscience/uvdat/commit/3179555149fc5c90d6d216cc6fcd8a0656ac6f99))

* Ingest geoJSON type for city Blocks dataset ([`2f5539b`](https://github.com/OpenGeoscience/uvdat/commit/2f5539bd7cea281951145b293c0897afdbf5cd18))

* Merge pull request #8 from OpenGeoscience/blank-analysis-task

Blank analysis task ([`bd0aa69`](https://github.com/OpenGeoscience/uvdat/commit/bd0aa696f2c4a73513d76192fe3c9fc945c132a1))

* Remove redundant edges in edge_list dict form ([`831ae32`](https://github.com/OpenGeoscience/uvdat/commit/831ae3273ccbf71fd6bb803c9a344252cd10fe08))

* Use dict structure for edge_list sent to network_gcc task ([`f803e05`](https://github.com/OpenGeoscience/uvdat/commit/f803e05453ce5f5fc1afbc6b69a248d36c828092))

* Add an endpoint to request gcc task ([`7c2805c`](https://github.com/OpenGeoscience/uvdat/commit/7c2805c4933aceeebb0b13c96d71d78ea70c0b45))

* Separate tasks into two files ([`46d4140`](https://github.com/OpenGeoscience/uvdat/commit/46d4140176cf84dc784d42e0c6bb073b0275e5db))

* Merge pull request #7 from OpenGeoscience/tide-level-dataset

Tide level dataset ([`e232745`](https://github.com/OpenGeoscience/uvdat/commit/e232745731f2401f3d636eb11171cc4dc73fc143))

* Fix cog reading and add print in tasks.py ([`6d09261`](https://github.com/OpenGeoscience/uvdat/commit/6d09261fa21416ee9e00377a907e6fa37cfc41e5))

* Add tide level dataset and use metadata field for network options ([`f96f0c8`](https://github.com/OpenGeoscience/uvdat/commit/f96f0c8efd3dd39b64e694bbe96a9f4e803d4410))

* Add metadata field to Dataset model ([`626d514`](https://github.com/OpenGeoscience/uvdat/commit/626d5148d3d022d4750b670fca2586becb947447))

* Merge pull request #6 from OpenGeoscience/network-vis

Network vis ([`4564085`](https://github.com/OpenGeoscience/uvdat/commit/4564085e390f4938df4930ec6915ccf0711448f8))

* Add functions to show dataset as a network representation ([`712e0cc`](https://github.com/OpenGeoscience/uvdat/commit/712e0cc47a3b62a07b715e7f1952ae67573f1f4c))

* Add endpoint to fetch network nodes for a dataset ([`8550d44`](https://github.com/OpenGeoscience/uvdat/commit/8550d44a44cdc5301b1035f6efbba1b1c8a43dea))

* Merge pull request #5 from OpenGeoscience/more-colormaps

Add more colormap options and use terrain as default ([`0f81001`](https://github.com/OpenGeoscience/uvdat/commit/0f8100161fcae54bb36ebc798079262867effd9b))

* More colormaps ([`d5e9804`](https://github.com/OpenGeoscience/uvdat/commit/d5e9804bc9f34b5803e6911f8d70a82e07e1bb68))

* Add more colormap options and use terrain as default ([`5f0624a`](https://github.com/OpenGeoscience/uvdat/commit/5f0624a0f9eef067a4018f46d355840178d9cbf3))

* Merge pull request #4 from OpenGeoscience/network-nodes

Network nodes ([`6d011fd`](https://github.com/OpenGeoscience/uvdat/commit/6d011fdf6475fd6c07b54184b6ff9ebba9e2900c))

* Update boston subway dataset url (point to cleaned version) ([`95ae2b5`](https://github.com/OpenGeoscience/uvdat/commit/95ae2b58c36417287e4541e7092064a193f4cda9))

* Add DC Metro Dataset ([`c27f2bb`](https://github.com/OpenGeoscience/uvdat/commit/c27f2bbd8eb85609ef82f8906fd187dae6e7385d))

* Algorithm fixes and add function to output network as geojson ([`5df2486`](https://github.com/OpenGeoscience/uvdat/commit/5df2486947fd93c7abe1eaa44d5a7b6413e8608f))

* Replace hard-coded key &#34;STATION&#34; ([`d612932`](https://github.com/OpenGeoscience/uvdat/commit/d612932bf83c6fffa286436abd822d4ecbefd1ea))

* Remove unnecessary column assignment ([`9166a3c`](https://github.com/OpenGeoscience/uvdat/commit/9166a3c8d1a12ca431b2d29d0fdf772c837a988a))

* Adjacency algorithm adjustment ([`c0b07af`](https://github.com/OpenGeoscience/uvdat/commit/c0b07afa2f7c2ec0dd44d6412928fa96bb936b2c))

* Add Network Nodes to admin interface ([`69871ef`](https://github.com/OpenGeoscience/uvdat/commit/69871ef14146d3651c95ad62620c8155b45d9967))

* Write a function in tasks that creates a network representation of a geodataframe ([`e4b1e2f`](https://github.com/OpenGeoscience/uvdat/commit/e4b1e2ff47826689303c8b274160d5369c1c23f2))

* Fix bug affecting swagger docs page ([`3b132ef`](https://github.com/OpenGeoscience/uvdat/commit/3b132ef302eb6b01eb0b8000614eb94aed5207a0))

* Mark some datasets with network=True prior to conversion process ([`c09ef2a`](https://github.com/OpenGeoscience/uvdat/commit/c09ef2ae715b8b4f5b8ff1178985624b0279a28a))

* Create NetworkNode model and serializer ([`e6b60bc`](https://github.com/OpenGeoscience/uvdat/commit/e6b60bcdd4667083484a55e714ed9c1e570876e8))

* Run conversion task synchronously in population script (don&#39;t send to celery) ([`4bb375b`](https://github.com/OpenGeoscience/uvdat/commit/4bb375b57d272e7d76bea17b746d714fe0001f5f))

* Merge pull request #3 from OpenGeoscience/options-panel

Options panel ([`5415191`](https://github.com/OpenGeoscience/uvdat/commit/54151919f125de9a4b07313c8110dbeb16c3959c))

* Fix tests ([`c6041be`](https://github.com/OpenGeoscience/uvdat/commit/c6041be4e2f55c0d7290238c821e829e7c018810))

* Remove LocMemCache and fix double quotes ([`8ac7b46`](https://github.com/OpenGeoscience/uvdat/commit/8ac7b46264557fd459d6fa53bab1c62da00e464f))

* Add GDAL to requirements ([`dc5a111`](https://github.com/OpenGeoscience/uvdat/commit/dc5a1110e2e46e01b82d72b7ea927d42044d0dc6))

* Fix formatting ([`be84aa5`](https://github.com/OpenGeoscience/uvdat/commit/be84aa54556b6af4aa7588ac8cd9066828678bf5))

* Add conversion button to Options panel and poll for processing Datasets ([`075f013`](https://github.com/OpenGeoscience/uvdat/commit/075f013a536dd33efabee716b1033512bdd759f4))

* Add Dataset conversion endpoint ([`5a6fa94`](https://github.com/OpenGeoscience/uvdat/commit/5a6fa9434f02505d8a41657c4228b98fe96d5845))

* Add processing flag to Datasets ([`87b61cf`](https://github.com/OpenGeoscience/uvdat/commit/87b61cf54803b6bc5be39751b66ea955556bf97f))

* Delay map spinner appearance by 1 second ([`02f0c03`](https://github.com/OpenGeoscience/uvdat/commit/02f0c03ad5f99d42d2a24dc8000e8117d9b55ee5))

* Add raster visualization options ([`1701e90`](https://github.com/OpenGeoscience/uvdat/commit/1701e90163823527318266c88f9870f1bceeb950))

* Create basic options panel ([`ba1e500`](https://github.com/OpenGeoscience/uvdat/commit/ba1e500c670d555cf620e8070a512e1e628d80a1))

* Merge pull request #2 from OpenGeoscience/raster-coloration

Raster client-side coloration ([`98f793b`](https://github.com/OpenGeoscience/uvdat/commit/98f793b33a11b391a2743c95442d45813f94e012))

* Remove normalization; maintain original values ([`18d06da`](https://github.com/OpenGeoscience/uvdat/commit/18d06da3671b4aad2c7e86e4d44bf814876e5a32))

* Add colormap and transparency below sea level ([`d9651d2`](https://github.com/OpenGeoscience/uvdat/commit/d9651d2476985dd585d347bdf235e6fc730d09a4))

* Raster conversion should stay grayscale (one channel) ([`d70d8bd`](https://github.com/OpenGeoscience/uvdat/commit/d70d8bd6192e8a8fc8ce0fcd2eb8a49038215758))

* Merge pull request #1 from OpenGeoscience/update-readme

Make setup instructions more clear ([`be80df0`](https://github.com/OpenGeoscience/uvdat/commit/be80df01b2cd54eb1cc282ea2b3a9e22170d822e))

* More explicit port explanation ([`4ed448a`](https://github.com/OpenGeoscience/uvdat/commit/4ed448aa154babe414a7432c0de7e2e62a08fe4f))

* Fix spacing ([`09db4c0`](https://github.com/OpenGeoscience/uvdat/commit/09db4c098911ad2d76dd44c622d06a51058fe64f))

* Make setup instructions more clear ([`8891ea8`](https://github.com/OpenGeoscience/uvdat/commit/8891ea8c054d3dd1ed518d49440e893ff3149f42))

* Enable drag-and-drop to reorder layers ([`53aa4aa`](https://github.com/OpenGeoscience/uvdat/commit/53aa4aa2bd5cb39add7f306c6bb9b4cd8850294f))

* Write layer creation functions in utils ([`db5f782`](https://github.com/OpenGeoscience/uvdat/commit/db5f782639749f7c3966aa449d32e7ba2c2b352f))

* Protect vector tile endpoint from StopIteration errors ([`3c1cf8b`](https://github.com/OpenGeoscience/uvdat/commit/3c1cf8b4e94f654f42054259c05a03058b753d35))

* Save all vector tiles in specialized json for faster retrieval ([`374bbde`](https://github.com/OpenGeoscience/uvdat/commit/374bbde4678358f320f942912c25d82b930a2058))

* Download data from data.kitware.com in populate script ([`8e5a11d`](https://github.com/OpenGeoscience/uvdat/commit/8e5a11d20071aebfc6a6cb78461f76a28e6dd372))

* Update postgis image version ([`ddcdc1a`](https://github.com/OpenGeoscience/uvdat/commit/ddcdc1a4f72c78a4c978bf8c7e7b7d5035ccb431))

* Show in UI when a dataset is still processing, use celery in populate command ([`fe4c412`](https://github.com/OpenGeoscience/uvdat/commit/fe4c4124c85a1a8eb180f473c9914bff133d5035))

* Add admin page specs for cities and datasets ([`eafaf48`](https://github.com/OpenGeoscience/uvdat/commit/eafaf4809e4def04ba6dc53706094aa972d29b4a))

* Add raster dataset (elevation) ([`b6db77d`](https://github.com/OpenGeoscience/uvdat/commit/b6db77dc1f2b23add7d46c30e4049e4cffe84db4))

* Don&#39;t generate vector tiles client side ([`c76fb47`](https://github.com/OpenGeoscience/uvdat/commit/c76fb479cdb30c14d0552ee26b441a435ad2e5b8))

* Add styling to vector tile layers ([`2b0b2d2`](https://github.com/OpenGeoscience/uvdat/commit/2b0b2d2613d56d5914993918ed6403b40ee3ee30))

* Don&#39;t create vector tiles server-side ([`bf98a4e`](https://github.com/OpenGeoscience/uvdat/commit/bf98a4e602394ee4ec84c6de7820448ed842efd4))

* Add web client that makes vector tiles from geojson ([`e78453c`](https://github.com/OpenGeoscience/uvdat/commit/e78453c4878a44135ac89385a8c2d2f90ad324d9))

* Start with City and Dataset models ([`35f1ced`](https://github.com/OpenGeoscience/uvdat/commit/35f1ceda8341309d4fb091e223386ec768b54c28))

* Cookiecutter initial commit ([`709fb18`](https://github.com/OpenGeoscience/uvdat/commit/709fb188c26aa70a0d9b620b4b0a3efb1914e73d))
