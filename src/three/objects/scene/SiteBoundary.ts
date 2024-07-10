import { Polygon, Position } from "geojson";
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from "three";
import { toMercator, centroid } from "@turf/turf";

class SiteBoundary extends Line {
  constructor(polygon: Polygon) {
    const geometry = new BufferGeometry();
    const material = new LineBasicMaterial({ color: 0xffffff });

    super(geometry, material);

    this.updateGeometry(polygon);
  }

  private updateGeometry(polygon: Polygon): void {
    // const coordinates = polygon.coordinates[0]; // Assuming the first linear ring
    // const points: Vector3[] = coordinates.map(
    //   ([x, y]) => new Vector3(x, 0, -y)
    // );

    // // Close the loop
    // points.push(points[0].clone());
    const points = this.getProjectedAndCenteredPoints(polygon);

    (this.geometry as BufferGeometry).setFromPoints(points);
  }

  private getProjectedAndCenteredPoints(polygon: Polygon): Vector3[] {
    // Find the centroid of the polygon
    const center = centroid(polygon);

    // Transform the polygon and centroid to Web Mercator coordinates
    const webMercatorPolygon = toMercator(polygon);
    const webMercatorCenter = toMercator(center).geometry.coordinates;

    // Helper function to check if the position is [number, number]
    const is2DPosition = (pos: Position): pos is [number, number] => {
      return pos.length === 2;
    };

    // Project, center, and convert to Vector3
    const projectedPoints: Vector3[] = webMercatorPolygon.coordinates[0].map(
      (pos: Position) => {
        if (is2DPosition(pos)) {
          const [x, y] = pos;
          // Negate x to flip east and west, use z for y (in Three.js, y is up)
          return new Vector3(
            -(x - webMercatorCenter[0]),
            0,
            -(y - webMercatorCenter[1])
          );
        } else {
          throw new Error("Unexpected position format");
        }
      }
    );

    // Close the loop
    projectedPoints.push(projectedPoints[0].clone());

    return projectedPoints;
  }
}

export default SiteBoundary;
