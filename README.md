
# gltfTransformifier

Convert a glTF asset into code that uses [glTF-Transform](https://github.com/donmccurdy/glTF-Transform) to generate the glTF asset.

### Setup:

- `git clone https://github.com/javagl/gltfTransformifier.git`
- `cd gltfTransformifier`
- `npm install`

### Running

`npx ts-node .\src\main.ts`

This will generate the source code for generating the examples that are contained in the `data/` directory, and write this code into the `generated` directory.

When running one of the generated files, for example

`npx ts-node .\generated\BoxAnimated\generateBoxAnimated.ts`

it will write the generated version of the original glTF asset into the `generated` directory.


### Example

The following is the (embedded) [`Triangle`](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Triangle) sample asset:

```json
{
  "scene": 0,
  "scenes": [
    {
      "nodes": [0]
    }
  ],

  "nodes": [
    {
      "mesh": 0
    }
  ],

  "meshes": [
    {
      "primitives": [
        {
          "attributes": {
            "POSITION": 1
          },
          "indices": 0
        }
      ]
    }
  ],

  "buffers": [
    {
      "uri": "data:application/octet-stream;base64,AAABAAIAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAAAAAACAPwAAAAA=",
      "byteLength": 44
    }
  ],
  "bufferViews": [
    {
      "buffer": 0,
      "byteOffset": 0,
      "byteLength": 6,
      "target": 34963
    },
    {
      "buffer": 0,
      "byteOffset": 8,
      "byteLength": 36,
      "target": 34962
    }
  ],
  "accessors": [
    {
      "bufferView": 0,
      "byteOffset": 0,
      "componentType": 5123,
      "count": 3,
      "type": "SCALAR",
      "max": [2],
      "min": [0]
    },
    {
      "bufferView": 1,
      "byteOffset": 0,
      "componentType": 5126,
      "count": 3,
      "type": "VEC3",
      "max": [1.0, 1.0, 0.0],
      "min": [0.0, 0.0, 0.0]
    }
  ],

  "asset": {
    "version": "2.0"
  }
}
```

Running this through the gltfTransformifier will generate the following code:

```TypeScript
import fs from "fs";
import path from "path";
import { NodeIO } from '@gltf-transform/core';
import { Document } from '@gltf-transform/core';
import { Accessor } from '@gltf-transform/core';
import { Buffer as GltfBuffer } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

async function run() {
  const document = new Document();
  const root = document.getRoot();
  
  // Buffers
  const buffer0 = document.createBuffer('');
  buffer0.setURI('simpleTriangle.bin');
  
  
  // Accessors
  // Accessor 0 of 2
  const accessor0 = document.createAccessor('');
  accessor0.setType('SCALAR');
  accessor0.setBuffer(buffer0);
  accessor0.setArray(new Uint16Array([
    0, 
    1, 
    2
  ]));
  
  // Accessor 1 of 2
  const accessor1 = document.createAccessor('');
  accessor1.setType('VEC3');
  accessor1.setBuffer(buffer0);
  accessor1.setArray(new Float32Array([
    0, 0, 0, 
    1, 0, 0, 
    0, 1, 0
  ]));
  
  
  // Meshes
  // Mesh 0 of 1
  const mesh0 = document.createMesh('');
  mesh0.setWeights([]);
  const mesh0_primitive0 = document.createPrimitive();
  mesh0_primitive0.setMode(4)
  mesh0_primitive0.setIndices(accessor0);
  mesh0_primitive0.setAttribute('POSITION', accessor1);
  mesh0.addPrimitive(mesh0_primitive0);
  
  
  // Nodes - No children or skin information
  // Node 0 of 1
  const node0 = document.createNode('');
  node0.setTranslation([0,0,0]);
  node0.setRotation([0,0,0,1]);
  node0.setScale([1,1,1]);
  node0.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  node0.setMesh(mesh0);
  
  
  // Nodes - Children and skin information
  // Node 0 of 1
  
  
  // Scenes
  // Scene 0 of 1
  const scene0 = document.createScene('');
  scene0.addChild(node0);
  
  
  root.setDefaultScene(scene0);
  
  
  // Consolidate into a single buffer
  const singleBuffer = root.listBuffers()[0];
  root.listAccessors().forEach((a: Accessor) => a.setBuffer(singleBuffer));
  root.listBuffers().forEach((b: GltfBuffer, index: number) => (index > 0 ? b.dispose() : null));
  
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const glb = await io.writeBinary(document);
  fs.writeFileSync('./generated/Triangle.glb', glb)
}
run();
```

Running this code will generate the `Triangle.glb` file with the following JSON:
```json
{
  "asset" : {
    "generator" : "glTF-Transform v3.4.5",
    "version" : "2.0"
  },
  "accessors" : [
    {
      "type" : "SCALAR",
      "componentType" : 5123,
      "count" : 3,
      "bufferView" : 0,
      "byteOffset" : 0
    },
    {
      "type" : "VEC3",
      "componentType" : 5126,
      "count" : 3,
      "max" : [
        1,
        1,
        0
      ],
      "min" : [
        0,
        0,
        0
      ],
      "bufferView" : 1,
      "byteOffset" : 0
    }
  ],
  "bufferViews" : [
    {
      "buffer" : 0,
      "byteOffset" : 0,
      "byteLength" : 8,
      "target" : 34963
    },
    {
      "buffer" : 0,
      "byteOffset" : 8,
      "byteLength" : 36,
      "byteStride" : 12,
      "target" : 34962
    }
  ],
  "buffers" : [
    {
      "byteLength" : 44
    }
  ],
  "meshes" : [
    {
      "primitives" : [
        {
          "attributes" : {
            "POSITION" : 1
          },
          "mode" : 4,
          "indices" : 0
        }
      ]
    }
  ],
  "nodes" : [
    {
      "mesh" : 0
    }
  ],
  "scenes" : [
    {
      "nodes" : [
        0
      ]
    }
  ],
  "scene" : 0
}
```

This represents the same asset as the original input.
