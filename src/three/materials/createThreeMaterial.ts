import { CachedBuildMaterial } from "@/data/build-systems";
import { DoubleSide, MeshLambertMaterial, MeshPhysicalMaterial } from "three";

const createThreeMaterial = (material: CachedBuildMaterial) => {
  if (material.specification === "Glass") {
    return new MeshPhysicalMaterial({
      // -- thickness of the clear coat layer, from 0.0 to 1.0
      clearcoat: 0.1,
      // -- Index-of-refraction for non-metallic materials, from 1.0 to 2.333. Default is 1.5.
      ior: 0.5,
      // -- Degree of reflectivity, from 0.0 to 1.0. Default is 0.5, which corresponds to an index-of-refraction of 1.5
      reflectivity: 0.5,
      // -- Degree of transmission (or optical transparency), from 0.0 to 1.0. Default is 0.0.
      // Thin, transparent or semitransparent, plastic or glass materials remain largely reflective even if they are fully transmissive. The transmission property can be used to model these materials.
      // When transmission is non-zero, opacity should be set to 1.
      transmission: 0.5,

      // #ebf1fa
      color: material.defaultColor,
      // color: "clear",
      metalness: 0,
      roughness: 0,
      alphaTest: 0.5,
      // envMap: hdrCubeRenderTarget.texture,
      // envMapIntensity: params.envMapIntensity,
      depthWrite: false,
      opacity: 1, // set material.opacity to 1 when material.transmission is non-zero
      transparent: true,
      // clipShadows: true,
    });
  }

  if (material.defaultColor) {
    return new MeshLambertMaterial({
      color: material.defaultColor,
      transparent: true,
      // emissive: "#000",
      side: DoubleSide,
      shadowSide: DoubleSide,
      // wireframe: true,
      opacity: 1,
      // depthTest: false,
      // clipShadows: true,
    });
  }

  // const textureLoader = new TextureLoader()

  // const setRepeat = (texture: Texture): void => {
  //   texture.wrapS = texture.wrapT = RepeatWrapping
  //   texture.repeat.set(10, 10)
  // }

  // const extractOrNullTextureMap = (url: string | undefined | null) =>
  //   url ? textureLoader.load(url, setRepeat) : null

  return new MeshLambertMaterial({
    color: 0xeeeeee,
    // map: extractOrNullTextureMap(config.textureUrl),
    // displacementMap: extractOrNullTextureMap(config.displacementUrl),
    // bumpMap: extractOrNullTextureMap(config.bumpUrl),
    // normalMap: extractOrNullTextureMap(config.normUrl),
    // aoMap: extractOrNullTextureMap(config.aoUrl),
    // roughnessMap: extractOrNullTextureMap(config.roughnessUrl),
    // displacementScale: 0, // this can be used to 'explode' the components
    // aoMapIntensity: 3.0,
    // envMap: null,
    // envMapIntensity: 1.5,
    // lightMap: null,
    // lightMapIntensity: 1,
    // emissiveMap: null,
    // emissive: 1,
    // emissiveIntensity: 1,
    // displacementBias: 1,
    // roughness: 0.5,
    // metalness: 0,
    // alphaMap: null,
    // bumpScale: 1,
    side: DoubleSide,
    // polygonOffset: true,
    // polygonOffsetFactor: 1,
    // clipIntersection: false,
    shadowSide: DoubleSide,
    // clipShadows: true,
    // clippingPlanes: [],
    // wireframe: false,
    // wireframeLinewidth: 1,
    // flatShading: false,
    transparent: true,
  });
};

export default createThreeMaterial;
