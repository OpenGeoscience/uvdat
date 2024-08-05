
def convert_dataset(dataset, options):
    print('\t', f'Converting data for {dataset.name}...')
    dataset.spawn_conversion_task(
        style_options=options.get('style_options'),
        network_options=options.get('network_options'),
        region_options=options.get('region_options'),
        asynchronous=False,
    )
