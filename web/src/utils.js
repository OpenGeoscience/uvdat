import { Fill, Stroke, Circle, Style } from "ol/style.js";

export const createStyle = (args) => {
  let colors = ["#00000022"];
  if (args.colors) {
    colors = args.colors.split(",");
  }
  if (!args.type) {
    return new Style();
  }
  return colors.map((colorHex, index) => {
    const styleSpec = {
      zIndex: colors.length - index,
    };
    if (args.type.includes("Point")) {
      styleSpec.image = new Circle({
        radius: 5 + 2 * index,
        fill: new Fill({
          color: colorHex,
        }),
      });
    } else if (args.type.includes("Line")) {
      styleSpec.stroke = new Stroke({
        color: colorHex,
        width: 3 + 2 * index,
      });
    } else if (args.type.includes("Polygon")) {
      styleSpec.fill = new Fill({
        color: colorHex.length > 7 ? colorHex : colorHex + "bb",
      });
    }
    return new Style(styleSpec);
  });
};
