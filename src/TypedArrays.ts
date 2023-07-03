import { TypedArray } from "@gltf-transform/core";
import { StringBuilder } from "./StringBuilder";

export class TypedArrays {
  static createString(array: TypedArray) {
    let s = "";
    s += "new " + TypedArrays.createConstructorString(array) + "(";
    s += TypedArrays.createArrayString(array);
    s += `)`;
    return s;
  }

  static createConstructorString(array: TypedArray) {
    if (array.constructor === Float32Array) {
      return `Float32Array`;
    }
    if (array.constructor === Uint32Array) {
      return `Uint32Array`;
    }
    if (array.constructor === Uint16Array) {
      return `Uint16Array`;
    }
    if (array.constructor === Uint8Array) {
      return `Uint8Array`;
    }
    if (array.constructor === Int16Array) {
      return `Int16Array`;
    }
    if (array.constructor === Int8Array) {
      return `Int8Array`;
    }
    return `Uint8Array`;
  }

  private static createArrayString(array: TypedArray): string {
    let s = "";
    s += `[`;
    for (let i = 0; i < array.length; i++) {
      if (i > 0) {
        s += ", ";
      }
      s += array[i];
    }
    s += `]`;
    return s;
  }

  static createFormattedString(
    array: TypedArray,
    baseIndentation: number,
    numComponentsPerElement: number
  ) {
    let s = "";
    s += "new " + TypedArrays.createConstructorString(array) + "(";
    s += TypedArrays.createFormattedArrayString(
      array,
      baseIndentation,
      numComponentsPerElement
    );
    s += `)`;
    return s;
  }

  private static createFormattedArrayString(
    array: TypedArray,
    baseIndentation: number,
    numComponentsPerElement: number
  ) {
    const sb = new StringBuilder();
    sb.addLine("[");
    for (let i = 0; i < baseIndentation; i++) {
      sb.increaseIndent();
    }
    sb.beginLine();
    let index = 0;
    const numElements = Math.ceil(array.length / numComponentsPerElement);
    for (let e = 0; e < numElements; e++) {
      for (let c = 0; c < numComponentsPerElement; c++) {
        if (index < array.length) {
          sb.add(array[index]);
        }
        if (index < array.length - 1) {
          sb.add(", ");
        }
        if (c === numComponentsPerElement - 1) {
          sb.endLine();
          if (e < numElements - 1) {
            sb.beginLine();
          }
        }
        index++;
      }
    }
    sb.decreaseIndent();
    sb.beginLine();
    sb.add("]");
    return sb.toString();
  }
}
