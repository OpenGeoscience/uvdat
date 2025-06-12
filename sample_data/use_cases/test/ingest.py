def convert_dataset(dataset, options):
    print('\t', f'Converting data for {dataset.name}...')
    dataset.spawn_conversion_task(
        layer_options=options.get('layers'),
        network_options=options.get('network_options'),
        region_options=options.get('region_options'),
        asynchronous=False,
    )
