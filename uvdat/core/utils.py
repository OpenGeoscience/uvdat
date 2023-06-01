from webcolors import name_to_hex


def add_styling(features, style_dict):
    if not style_dict:
        return features

    property_map = style_dict.get('property_map') or {}
    options = style_dict.get('options') or {}

    for feature in features:
        if property_map:
            for key, value in property_map.items():
                if key == 'colors':
                    color_delimiter = options.get('color_delimiter', ',')
                    outline = options.get('outline')
                    palette = options.get('palette')
                    colors = (
                        str(feature['properties'].get(value)).split(color_delimiter)
                        if feature['properties'].get(value)
                        else str(value).split(color_delimiter)
                    )
                    try:
                        colors = [
                            name_to_hex(palette[c]) if palette and c in palette else name_to_hex(c)
                            for c in colors
                        ]
                        feature['properties'][key] = ','.join(colors)
                        if outline:
                            feature['properties'][key] += ',' + name_to_hex(outline)
                    except ValueError:
                        pass

                elif value in feature['properties']:
                    feature['properties'][key] = feature['properties'][value]
    return features
