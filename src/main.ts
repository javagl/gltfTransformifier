import { NodeIO } from "@gltf-transform/core";

import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { GltfTransformifier } from "./GltfTransformifier";

async function run(
  inputFileName: string,
  outputFileName: string,
  glbFileName: string
) {
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const document = await io.read(inputFileName);
  const g = new GltfTransformifier(document);

  console.log("Generating code from " + inputFileName);
  const result = g.generate(glbFileName);

  console.log("Writing code to " + outputFileName);
  g.write(outputFileName, result);
}

async function runTest(modelName: string) {
  const baseDir = "./data/";
  const inputDir = baseDir + modelName + "/glTF/";
  const inputFileName = inputDir + modelName + ".gltf";
  const outputFileName =
    "./generated/" + modelName + "/generate" + modelName + ".ts";
  const glbFileName = "./generated/" + modelName + ".glb";
  await run(inputFileName, outputFileName, glbFileName);
}

async function runAll() {
  await runTest("Triangle");
  await runTest("BoxAnimated");
  await runTest("SimpleMorph");
  await runTest("SimpleSkin");
  await runTest("SimpleSparseAccessor");
  await runTest("TwoSidedPlane");
}

runAll();
