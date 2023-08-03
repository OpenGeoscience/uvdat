from webcolors import name_to_hex


def add_styling(features, style_dict):
    if not style_dict:
        return features

    property_map = style_dict.get('property_map') or {}
    options = style_dict.get('options') or {}
    outline = options.get('outline')
    palette = options.get('palette')
    color_delimiter = options.get('color_delimiter', ',')

    for index, feature in enumerate(features):
        feature_colors = []
        if property_map:
            if 'colors' in property_map:
                map_value = property_map['colors']
                property_value = feature['properties'].get(map_value)
                if property_value:
                    feature_colors += property_value.split(color_delimiter)

        if type(palette) == dict:
            feature_colors = [palette[c] for c in feature_colors]
        else:
            feature_colors.append(palette[index % len(palette)])

        if outline:
            feature_colors.append(outline)

        feature_colors = [name_to_hex(c) for c in feature_colors]
        feature['properties']['colors'] = ','.join(feature_colors)
    return features
