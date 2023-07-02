import { TypedArray } from "@gltf-transform/core";

export class TypedArrays {
  static createString(array: TypedArray) {
    let s = ``;
    if (array.constructor === Float32Array) {
      s += `new Float32Array(`;
    }
    if (array.constructor === Uint32Array) {
      s += `new Uint32Array(`;
    }
    if (array.constructor === Uint16Array) {
      s += `new Uint16Array(`;
    }
    if (array.constructor === Uint8Array) {
      s += `new Uint8Array(`;
    }
    if (array.constructor === Int16Array) {
      s += `new Int16Array(`;
    }
    if (array.constructor === Int8Array) {
      s += `new Int8Array(`;
    }
    if (array.constructor === Buffer) {
      s += `new Uint8Array(`;
    }
    s += `[`;
    for (let i = 0; i < array.length; i++) {
      if (i > 0) {
        s += ", ";
      }
      s += array[i];
    }
    s += `]`;
    s += `)`;
    return s;
  }
}
