import json
from pathlib import Path

from jsonschema import validate
from jsonschema.exceptions import ValidationError

SCHEMA_FILE = Path(__file__).parent / 'algorithm_schema.json'
with open(SCHEMA_FILE) as f:
    SCHEMA = json.load(f)


def validate_algorithm_spec(spec):
    try:
        validate(instance=spec, schema=SCHEMA)
    except ValidationError as e:
        print(f'Validation error: {e.message}')


for spec_path in [
    'flood_simulation_spec.json',
    'flood_network_failure_spec.json',
    'network_recovery_spec.json',
    'segment_curbs_spec.json',
]:
    print(f'Validating {spec_path}.')
    with open(Path(__file__).parent / spec_path) as f:
        validate_algorithm_spec(json.load(f))
