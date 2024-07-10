import { describe, expect, it } from "vitest";
import { decodeShareUrlPayload, encodeShareUrlPayload } from "./utils";
import { Polygon } from "geojson";
import { House } from "./houses";

describe("Share URL Payload Functions", () => {
  const validHouse: House = {
    houseId: "1",
    houseTypeId: "type1",
    systemId: "system1",
    dnas: ["dna1", "dna2"],
    activeElementMaterials: { element1: "material1" },
    friendlyName: "My House",
    position: { x: 1, y: 2, z: 3 },
    rotation: 45,
  };

  const validPolygon: Polygon = {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 1],
        [2, 2],
        [0, 0],
      ],
    ],
  };

  describe("encodeShareUrlPayload and decodeShareUrlPayload", () => {
    const testCases = [
      {
        name: "with houses and polygon",
        payload: { houses: [validHouse], polygon: validPolygon },
      },
      {
        name: "with houses and null polygon",
        payload: { houses: [validHouse], polygon: null },
      },
      {
        name: "with empty houses and polygon",
        payload: { houses: [], polygon: validPolygon },
      },
      {
        name: "with empty houses and null polygon",
        payload: { houses: [], polygon: null },
      },
      {
        name: "with only houses",
        payload: { houses: [validHouse] },
      },
      {
        name: "with only polygon",
        payload: { polygon: validPolygon },
      },
      {
        name: "with empty payload",
        payload: {},
      },
    ];

    testCases.forEach(({ name, payload }) => {
      it(`should handle payload ${name}`, () => {
        const encoded = encodeShareUrlPayload(payload);
        expect(encoded).toBeDefined();
        expect(typeof encoded).toBe("string");

        const decoded = decodeShareUrlPayload(encoded);
        expect(decoded).toEqual({
          houses: payload.houses || [],
          polygon: payload.polygon === undefined ? null : payload.polygon,
        });
      });
    });
  });
});
