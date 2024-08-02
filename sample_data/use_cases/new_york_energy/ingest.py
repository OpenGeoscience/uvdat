from pathlib import Path
from .import_networks import perform_import
from .export_networks import perform_export
from .nysdp import create_consolidated_network


DOWNLOADS_FOLDER = DOWNLOADS_FOLDER = Path('../../sample_data/downloads')
PULL_LATEST = False


def convert_dataset(dataset, options, ):
    print('\t', f'Converting data for {dataset.name}...')
    if dataset.name == 'National Grid County Networks':
        if PULL_LATEST:
            # pull latest data from NYSDP and run network interpretation algorithm
            dataset.source_files.delete()
            create_consolidated_network(dataset, downloads_folder=DOWNLOADS_FOLDER)
            perform_export()
        else:
            perform_import(dataset, downloads_folder=DOWNLOADS_FOLDER)
    else:
        dataset.spawn_conversion_task(
            style_options=options.get('style_options'),
            network_options=options.get('network_options'),
            region_options=options.get('region_options'),
            asynchronous=False,
        )
