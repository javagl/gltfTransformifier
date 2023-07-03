
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
