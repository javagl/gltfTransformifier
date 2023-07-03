import fs from "fs";
import path from "path";

import { Document } from "@gltf-transform/core";
import { TypedArray } from "@gltf-transform/core";

import { Accessor } from "@gltf-transform/core";
import { Animation } from "@gltf-transform/core";
import { Camera } from "@gltf-transform/core";
import { Material } from "@gltf-transform/core";
import { Mesh } from "@gltf-transform/core";
import { Node } from "@gltf-transform/core";
import { Scene } from "@gltf-transform/core";
import { Skin } from "@gltf-transform/core";
import { Texture } from "@gltf-transform/core";
import { Buffer as GltfBuffer } from "@gltf-transform/core";

import { StringBuilder } from "./StringBuilder";
import { TypedArrays } from "./TypedArrays";

interface Config {
  externalAccessorsThreshold: number;
  externalImagesThreshold: number;
}

export interface Result {
  code: string;
  externalAccessors: { [key: string]: TypedArray };
  externalImages: { [key: string]: Uint8Array };
}

export class GltfTransformifier {
  private readonly config: Config = {
    externalAccessorsThreshold: 1000,
    externalImagesThreshold: 1000,
  };

  private readonly document: Document;
  private readonly sb: StringBuilder;

  private readonly scenes: Scene[];
  private readonly nodes: Node[];
  private readonly cameras: Camera[];
  private readonly skins: Skin[];
  private readonly meshes: Mesh[];
  private readonly materials: Material[];
  private readonly textures: Texture[];
  private readonly animations: Animation[];
  private readonly accessors: Accessor[];
  private readonly buffers: GltfBuffer[];

  private readonly externalAccessors: { [key: string]: TypedArray };
  private readonly externalImages: { [key: string]: Uint8Array };

  constructor(document: Document) {
    this.document = document;
    this.sb = new StringBuilder();

    const root = document.getRoot();
    this.scenes = root.listScenes();
    this.nodes = root.listNodes();
    this.cameras = root.listCameras();
    this.skins = root.listSkins();
    this.meshes = root.listMeshes();
    this.materials = root.listMaterials();
    this.textures = root.listTextures();
    this.animations = root.listAnimations();
    this.accessors = root.listAccessors();
    this.buffers = root.listBuffers();

    this.externalAccessors = {};
    this.externalImages = {};
  }

  private initStringBuilder() {
    const sb = this.sb;
    sb.addLine(`import fs from "fs";`);
    sb.addLine(`import path from "path";`);
    sb.addLine(`import { NodeIO } from '@gltf-transform/core';`);
    sb.addLine(`import { Document } from '@gltf-transform/core';`);
    sb.addLine(`import { Accessor } from '@gltf-transform/core';`);
    sb.addLine(`import { Buffer as GltfBuffer } from '@gltf-transform/core';`);
    sb.addLine(
      `import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";`
    );

    sb.addLine(``);
    sb.addLine(`async function run() {`);
    sb.increaseIndent();
    sb.addLine(`const document = new Document();`);
    sb.addLine(`const root = document.getRoot();`);
    sb.addLine(``);
  }

  private finishStringBuilder(outputFileName: string) {
    const sb = this.sb;

    sb.addLine(``);
    sb.addLine(`// Consolidate into a single buffer`);
    sb.addLine(`const singleBuffer = root.listBuffers()[0];`);
    sb.addLine(
      `root.listAccessors().forEach((a: Accessor) => a.setBuffer(singleBuffer));`
    );
    sb.addLine(
      `root.listBuffers().forEach((b: GltfBuffer, index: number) => (index > 0 ? b.dispose() : null));`
    );
    sb.addLine(``);
    sb.addLine(
      `const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);`
    );
    sb.addLine(`const glb = await io.writeBinary(document);`);
    sb.addLine(`fs.writeFileSync('${outputFileName}', glb)`);

    sb.decreaseIndent();
    sb.addLine(`}`);
    sb.addLine(`run();`);
  }

  private generateBuffers() {
    if (this.buffers.length === 0) {
      return;
    }
    const sb = this.sb;
    const buffers = this.buffers;
    sb.addLine(`// Buffers`);
    for (let i = 0; i < buffers.length; i++) {
      const name = buffers[i].getName();
      const uri = buffers[i].getURI();
      sb.addLine(`const buffer${i} = document.createBuffer('${name}');`);
      sb.addLine(`buffer${i}.setURI('${uri}');`);
      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateAccessors() {
    if (this.accessors.length === 0) {
      return;
    }
    const config = this.config;
    const sb = this.sb;
    const accessors = this.accessors;
    const buffers = this.buffers;
    const externalAccessors = this.externalAccessors;
    sb.addLine(`// Accessors`);
    for (let i = 0; i < accessors.length; i++) {
      sb.addLine(`// Accessor ${i} of ${accessors.length}`);

      const name = accessors[i].getName();
      const type = accessors[i].getType();

      sb.addLine(`const accessor${i} = document.createAccessor('${name}');`);
      sb.addLine(`accessor${i}.setType('${type}');`);
      const accessorBuffer = accessors[i].getBuffer();
      if (accessorBuffer) {
        const bufferIndex = buffers.indexOf(accessorBuffer);
        sb.addLine(`accessor${i}.setBuffer(buffer${bufferIndex});`);
      }

      const array = accessors[i].getArray();
      if (array) {
        if (array.length > config.externalAccessorsThreshold) {
          externalAccessors[`accessor${i}`] = array;
          const resolvedName = `path.resolve(__dirname, 'accessor${i}')`;
          sb.addLine(
            `const accessor${i}_data = fs.readFileSync(${resolvedName});`
          );
          sb.addLine(`accessor${i}.setArray(accessor${i}_data);`);
        } else {
          const arrayString = TypedArrays.createFormattedString(
            array,
            sb.getIndent(),
            accessors[i].getElementSize()
          );
          sb.addLine(`accessor${i}.setArray(${arrayString});`);
        }
      }
      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateTextures() {
    if (this.textures.length === 0) {
      return;
    }
    const config = this.config;
    const sb = this.sb;
    const textures = this.textures;
    const externalImages = this.externalImages;
    sb.addLine(`// Textures`);
    for (let i = 0; i < textures.length; i++) {
      sb.addLine(`// Texture ${i} of ${textures.length}`);

      const name = textures[i].getName();
      const uri = textures[i].getURI();
      const mimeType = textures[i].getMimeType();

      let externalFileExtension = "";
      if (mimeType === "image/jpeg") {
        externalFileExtension = ".jpg";
      } else if (mimeType === "image/png") {
        externalFileExtension = ".png";
      }

      sb.addLine(`const texture${i} = document.createTexture('${name}');`);
      sb.addLine(`texture${i}.setURI('${uri}');`);
      sb.addLine(`texture${i}.setMimeType('${mimeType}');`);

      const image = textures[i].getImage();
      if (image) {
        if (image.length > config.externalImagesThreshold) {
          externalImages[`image${i}${externalFileExtension}`] = image;
          const resolvedName = `path.resolve(__dirname, 'image${i}${externalFileExtension}')`;
          sb.addLine(
            `const image${i}_data = fs.readFileSync(${resolvedName});`
          );
          sb.addLine(`texture${i}.setImage(image${i}_data);`);
        } else {
          const imageString = TypedArrays.createFormattedString(
            image,
            sb.getIndent(),
            10
          );
          sb.addLine(`texture${i}.setImage(${imageString});`);
        }
      }
      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateMaterials() {
    if (this.materials.length === 0) {
      return;
    }
    const sb = this.sb;
    const materials = this.materials;
    const textures = this.textures;
    sb.addLine(`// Materials`);
    for (let i = 0; i < materials.length; i++) {
      sb.addLine(`// Material ${i} of ${materials.length}`);

      const name = materials[i].getName();
      const doubleSided = materials[i].getDoubleSided();
      const alpha = materials[i].getAlpha();
      const alphaMode = materials[i].getAlphaMode();
      const alphaCutoff = materials[i].getAlphaCutoff();
      const baseColorFactor = materials[i].getBaseColorFactor();
      const baseColorTexture = materials[i].getBaseColorTexture();
      const emissiveFactor = materials[i].getEmissiveFactor();
      const emissiveTexture = materials[i].getEmissiveTexture();
      const normalScale = materials[i].getNormalScale();
      const normalTexture = materials[i].getNormalTexture();
      const occlusionStrength = materials[i].getOcclusionStrength();
      const occlusionTexture = materials[i].getOcclusionTexture();
      const roughnessFactor = materials[i].getRoughnessFactor();
      const metallicFactor = materials[i].getMetallicFactor();
      const metallicRoughnessTexture =
        materials[i].getMetallicRoughnessTexture();

      sb.addLine(`const material${i} = document.createMaterial('${name}');`);
      sb.addLine(`material${i}.setDoubleSided(${doubleSided});`);
      sb.addLine(`material${i}.setAlpha(${alpha});`);
      sb.addLine(`material${i}.setAlphaMode('${alphaMode}');`);
      sb.addLine(`material${i}.setAlphaCutoff(${alphaCutoff});`);
      sb.addLine(`material${i}.setBaseColorFactor([${baseColorFactor}]);`);

      if (baseColorTexture) {
        const baseColorTextureIndex = textures.indexOf(baseColorTexture);
        sb.addLine(
          `material${i}.setBaseColorTexture(texture${baseColorTextureIndex});`
        );
      }

      sb.addLine(`material${i}.setEmissiveFactor([${emissiveFactor}]);`);

      if (emissiveTexture) {
        const emissiveTextureIndex = textures.indexOf(emissiveTexture);
        sb.addLine(
          `material${i}.setEmissiveTexture(texture${emissiveTextureIndex});`
        );
      }

      sb.addLine(`material${i}.setNormalScale(${normalScale});`);

      if (normalTexture) {
        const normalTextureIndex = textures.indexOf(normalTexture);
        sb.addLine(
          `material${i}.setNormalTexture(texture${normalTextureIndex});`
        );
      }

      sb.addLine(`material${i}.setOcclusionStrength(${occlusionStrength});`);

      if (occlusionTexture) {
        const occlusionTextureIndex = textures.indexOf(occlusionTexture);
        sb.addLine(
          `material${i}.setOcclusionTexture(texture${occlusionTextureIndex});`
        );
      }

      sb.addLine(`material${i}.setRoughnessFactor(${roughnessFactor});`);
      sb.addLine(`material${i}.setMetallicFactor(${metallicFactor});`);

      if (metallicRoughnessTexture) {
        const metallicRoughnessTextureIndex = textures.indexOf(
          metallicRoughnessTexture
        );
        sb.addLine(
          `material${i}.setMetallicRoughnessTexture(texture${metallicRoughnessTextureIndex});`
        );
      }

      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateMeshes() {
    if (this.meshes.length === 0) {
      return;
    }
    const sb = this.sb;
    const meshes = this.meshes;
    const accessors = this.accessors;
    const materials = this.materials;

    sb.addLine(`// Meshes`);
    for (let i = 0; i < meshes.length; i++) {
      sb.addLine(`// Mesh ${i} of ${meshes.length}`);

      const name = meshes[i].getName();
      const weights = meshes[i].getWeights();

      sb.addLine(`const mesh${i} = document.createMesh('${name}');`);
      sb.addLine(`mesh${i}.setWeights([${weights}]);`);

      const primitives = meshes[i].listPrimitives();
      for (let j = 0; j < primitives.length; j++) {
        sb.addLine(
          `const mesh${i}_primitive${j} = document.createPrimitive();`
        );

        const mode = primitives[j].getMode();
        sb.addLine(`mesh${i}_primitive${j}.setMode(${mode})`);

        const indices = primitives[j].getIndices();
        const material = primitives[j].getMaterial();
        const semantics = primitives[j].listSemantics();
        const targets = primitives[j].listTargets();

        if (indices) {
          const indicesIndex = accessors.indexOf(indices);
          sb.addLine(
            `mesh${i}_primitive${j}.setIndices(accessor${indicesIndex});`
          );
        }

        if (material) {
          const materialIndex = materials.indexOf(material);
          sb.addLine(
            `mesh${i}_primitive${j}.setMaterial(material${materialIndex});`
          );
        }

        for (const semantic of semantics) {
          const attribute = primitives[j].getAttribute(semantic);
          if (attribute) {
            const attributeIndex = accessors.indexOf(attribute);
            sb.addLine(
              `mesh${i}_primitive${j}.setAttribute('${semantic}', accessor${attributeIndex});`
            );
          }
        }

        for (let k = 0; k < targets.length; k++) {
          const targetName = targets[k].getName();
          sb.addLine(
            `const mesh${i}_primitive${j}_target${k} = document.createPrimitiveTarget('${targetName}');`
          );
          const targetSemantics = targets[k].listSemantics();
          for (const targetSemantic of targetSemantics) {
            const attribute = targets[k].getAttribute(targetSemantic);
            if (attribute) {
              const attributeIndex = accessors.indexOf(attribute);
              sb.addLine(
                `mesh${i}_primitive${j}_target${k}.setAttribute('${targetSemantic}', accessor${attributeIndex});`
              );
            }
          }
          sb.addLine(
            `mesh${i}_primitive${j}.addTarget(mesh${i}_primitive${j}_target${k});`
          );
        }

        sb.addLine(`mesh${i}.addPrimitive(mesh${i}_primitive${j});`);
      }

      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateCameras() {
    if (this.cameras.length === 0) {
      return;
    }
    const sb = this.sb;
    const cameras = this.cameras;
    sb.addLine(`// Cameras`);
    for (let i = 0; i < cameras.length; i++) {
      sb.addLine(`// Camera ${i} of ${cameras.length}`);

      const name = cameras[i].getName();
      const type = cameras[i].getType();
      const zNear = cameras[i].getZNear();
      const zFar = cameras[i].getZFar();
      const aspectRatio = cameras[i].getAspectRatio();
      const yFov = cameras[i].getYFov();
      const xMag = cameras[i].getXMag();
      const yMag = cameras[i].getYMag();

      sb.addLine(`const camera${i} = document.createCamera('${name}');`);
      sb.addLine(`camera${i}.setType('${type}');`);
      sb.addLine(`camera${i}.setZNear(${zNear});`);
      sb.addLine(`camera${i}.setZFar(${zFar});`);
      sb.addLine(`camera${i}.setAspectRatio(${aspectRatio});`);
      sb.addLine(`camera${i}.setYFov(${yFov});`);
      sb.addLine(`camera${i}.setXMag(${xMag});`);
      sb.addLine(`camera${i}.setYMag(${yMag});`);

      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateNodes() {
    if (this.nodes.length === 0) {
      return;
    }
    const sb = this.sb;
    const nodes = this.nodes;
    const cameras = this.cameras;
    const meshes = this.meshes;
    sb.addLine(`// Nodes - No children or skin information`);
    for (let i = 0; i < nodes.length; i++) {
      sb.addLine(`// Node ${i} of ${nodes.length}`);

      const name = nodes[i].getName();
      const translation = nodes[i].getTranslation();
      const rotation = nodes[i].getRotation();
      const scale = nodes[i].getScale();
      const matrix = nodes[i].getMatrix();
      const camera = nodes[i].getCamera();
      const mesh = nodes[i].getMesh();

      sb.addLine(`const node${i} = document.createNode('${name}');`);
      sb.addLine(`node${i}.setTranslation([${translation}]);`);
      sb.addLine(`node${i}.setRotation([${rotation}]);`);
      sb.addLine(`node${i}.setScale([${scale}]);`);
      sb.addLine(`node${i}.setMatrix([${matrix}]);`);

      if (camera) {
        const cameraIndex = cameras.indexOf(camera);
        sb.addLine(`node${i}.setCamera(camera${cameraIndex});`);
      }

      if (mesh) {
        const meshIndex = meshes.indexOf(mesh);
        sb.addLine(`node${i}.setMesh(mesh${meshIndex});`);
      }

      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateSkins() {
    if (this.skins.length === 0) {
      return;
    }
    const sb = this.sb;
    const skins = this.skins;
    const accessors = this.accessors;
    const nodes = this.nodes;
    sb.addLine(`// Skins`);
    for (let i = 0; i < skins.length; i++) {
      sb.addLine(`// Skin ${i} of ${skins.length}`);

      const name = skins[i].getName();
      const inverseBindMatrices = skins[i].getInverseBindMatrices();
      const skeleton = skins[i].getSkeleton();
      const joints = skins[i].listJoints();

      sb.addLine(`const skin${i} = document.createSkin('${name}');`);
      if (inverseBindMatrices) {
        const inverseBindMatricesIndex = accessors.indexOf(inverseBindMatrices);
        sb.addLine(
          `skin${i}.setInverseBindMatrices(accessor${inverseBindMatricesIndex});`
        );
      }
      if (skeleton) {
        const skeletonIndex = nodes.indexOf(skeleton);
        sb.addLine(`skin${i}.setSkeleton(node${skeletonIndex});`);
      }
      for (const joint of joints) {
        const jointIndex = nodes.indexOf(joint);
        sb.addLine(`skin${i}.addJoint(node${jointIndex});`);
      }

      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateNodeConnections() {
    if (this.nodes.length === 0) {
      return;
    }
    const sb = this.sb;
    const nodes = this.nodes;
    const skins = this.skins;
    sb.addLine(`// Nodes - Children and skin information`);
    for (let i = 0; i < nodes.length; i++) {
      sb.addLine(`// Node ${i} of ${nodes.length}`);

      const name = nodes[i].getName();
      const children = nodes[i].listChildren();
      const skin = nodes[i].getSkin();

      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        const childIndex = nodes.indexOf(child);
        sb.addLine(`node${i}.addChild(node${childIndex});`);
      }

      if (skin) {
        const skinIndex = skins.indexOf(skin);
        sb.addLine(`node${i}.setSkin(skin${skinIndex});`);
      }

      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateAnimations() {
    if (this.animations.length === 0) {
      return;
    }
    const sb = this.sb;
    const animations = this.animations;
    const accessors = this.accessors;
    const nodes = this.nodes;
    sb.addLine(`// Animations`);
    for (let i = 0; i < animations.length; i++) {
      sb.addLine(`// Animation ${i} of ${animations.length}`);

      const name = animations[i].getName();
      const samplers = animations[i].listSamplers();
      const channels = animations[i].listChannels();
      sb.addLine(`const animation${i} = document.createAnimation('${name}');`);

      for (let j = 0; j < samplers.length; j++) {
        sb.addLine(`// Animation ${i} sampler ${j}`);

        const samplerName = samplers[j].getName();
        const samplerInput = samplers[j].getInput();
        const samplerOutput = samplers[j].getOutput();
        if (samplerInput && samplerOutput) {
          const samplerInputIndex = accessors.indexOf(samplerInput);
          const samplerOutputIndex = accessors.indexOf(samplerOutput);
          const interpolation = samplers[j].getInterpolation();

          sb.addLine(
            `const animation${i}_sampler${j} = document.createAnimationSampler('${samplerName}');`
          );
          sb.addLine(
            `animation${i}_sampler${j}.setInput(accessor${samplerInputIndex});`
          );
          sb.addLine(
            `animation${i}_sampler${j}.setOutput(accessor${samplerOutputIndex});`
          );
          sb.addLine(
            `animation${i}_sampler${j}.setInterpolation('${interpolation}');`
          );
          sb.addLine(`animation${i}.addSampler(animation${i}_sampler${j});`);
        }
        sb.addLine(``);
      }
      for (let j = 0; j < channels.length; j++) {
        sb.addLine(`// Animation ${i} channel ${j}`);

        const channelName = channels[j].getName();
        const targetNode = channels[j].getTargetNode();
        const sampler = channels[j].getSampler();
        if (targetNode && sampler) {
          const targetNodeIndex = nodes.indexOf(targetNode);
          const samplerIndex = samplers.indexOf(sampler);
          const targetPath = channels[j].getTargetPath();

          sb.addLine(
            `const animation${i}_channel${j} = document.createAnimationChannel('${channelName}');`
          );
          sb.addLine(
            `animation${i}_channel${j}.setTargetNode(node${targetNodeIndex});`
          );
          sb.addLine(
            `animation${i}_channel${j}.setTargetPath('${targetPath}');`
          );
          sb.addLine(
            `animation${i}_channel${j}.setSampler(animation${i}_sampler${samplerIndex});`
          );
          sb.addLine(`animation${i}.addChannel(animation${i}_channel${j});`);
        }
        sb.addLine(``);
      }
      sb.addLine(``);
    }
  }

  private generateScenes() {
    if (this.scenes.length === 0) {
      return;
    }
    const sb = this.sb;
    const scenes = this.scenes;
    const nodes = this.nodes;
    sb.addLine(`// Scenes`);
    for (let i = 0; i < scenes.length; i++) {
      sb.addLine(`// Scene ${i} of ${scenes.length}`);

      const name = scenes[i].getName();

      sb.addLine(`const scene${i} = document.createScene('${name}');`);

      const children = scenes[i].listChildren();
      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        const childIndex = nodes.indexOf(child);
        sb.addLine(`scene${i}.addChild(node${childIndex});`);
      }
      sb.addLine(``);
    }
    sb.addLine(``);
  }

  private generateDefaultScene() {
    const root = this.document.getRoot();
    const defaultScene = root.getDefaultScene();
    const sb = this.sb;
    const scenes = this.scenes;
    if (defaultScene) {
      const sceneIndex = scenes.indexOf(defaultScene);
      sb.addLine(`root.setDefaultScene(scene${sceneIndex});`);
      sb.addLine(``);
    }
  }

  generate(outputFileName?: string): Result {
    this.initStringBuilder();
    this.generateBuffers();
    this.generateAccessors();
    this.generateTextures();
    this.generateMaterials();
    this.generateMeshes();
    this.generateCameras();
    this.generateNodes();
    this.generateSkins();
    this.generateNodeConnections();
    this.generateAnimations();
    this.generateScenes();
    this.generateDefaultScene();
    this.finishStringBuilder(
      outputFileName === undefined ? "gltfTransformifier.glb" : outputFileName
    );
    const code = this.sb.toString();
    return {
      code: code,
      externalAccessors: this.externalAccessors,
      externalImages: this.externalImages,
    };
  }

  write(outputFileName: string, result: Result) {
    const outputDirectory = path.dirname(outputFileName);
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }
    fs.writeFileSync(outputFileName, result.code);
    for (const key of Object.keys(result.externalAccessors)) {
      const data = result.externalAccessors[key];
      const externalFileName = path.join(outputDirectory, key);
      fs.writeFileSync(externalFileName, data);
    }
    for (const key of Object.keys(result.externalImages)) {
      const data = result.externalImages[key];
      const externalFileName = path.join(outputDirectory, key);
      fs.writeFileSync(externalFileName, data);
    }
  }
}
