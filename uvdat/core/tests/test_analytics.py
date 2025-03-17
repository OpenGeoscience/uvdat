import re
from time import sleep

import pytest


@pytest.mark.django_db
def test_rest_list_analysis_types(authenticated_api_client, project):
    from uvdat.core.tasks.analytics import __all__ as analysis_types

    analysis_type_instances = [at() for at in analysis_types]
    resp = authenticated_api_client.get(f'/api/v1/analytics/project/{project.id}/types/')
    data = resp.json()
    assert len(data) == 4
    assert set(type_info.get('name') for type_info in data) == set(
        i.name for i in analysis_type_instances
    )
    for type_info in data:
        instance = next(iter(i for i in analysis_type_instances if i.name == type_info.get('name')))
        assert type_info.get('description') == instance.description
        assert type_info.get('attribution') == instance.attribution
        assert type_info.get('output_types') == instance.output_types
        input_options = type_info.get('input_options')
        for k, v in instance.get_input_options().items():
            assert len(input_options.get(k)) == len(v)


@pytest.mark.parametrize(
    'task', ['flood_simulation', 'flood_network_failure', 'network_recovery', 'segment_curbs']
)
@pytest.mark.django_db
def test_rest_run_analysis_task_no_inputs(authenticated_api_client, user, project, task):
    project.add_followers([user])
    resp = authenticated_api_client.post(
        f'/api/v1/analytics/project/{project.id}/types/{task}/run/'
    )
    data = resp.json()

    # evaluate initial response
    assert data.get('analysis_type') == task
    assert data.get('project') == project.id
    assert data.get('status') == 'Initializing task...'
    assert data.get('inputs') == {}
    assert data.get('error') is None
    assert data.get('outputs') is None
    assert data.get('completed') is None

    # result object should encounter error due to lack of inputs
    sleep(1)
    result_id = data.get('id')
    resp = authenticated_api_client.get(f'/api/v1/analytics/{result_id}/')
    data = resp.json()
    assert data.get('id') == result_id
    assert data.get('analysis_type') == task
    assert data.get('error') is not None
    assert re.search(r'(.+) not provided', data.get('error')) is not None
    assert re.search(r'Completed in (\d|.)+ seconds.', data.get('status')) is not None
