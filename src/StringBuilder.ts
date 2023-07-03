export class StringBuilder {
  private s: string;
  private indent: number;
  private indentation: number;
  constructor(indent?: number) {
    this.s = "";
    this.indentation = 2;
    this.indent = indent === undefined ? 0 : indent;
  }
  increaseIndent() {
    this.indent += this.indentation;
  }
  decreaseIndent() {
    this.indent -= this.indentation;
  }
  getIndent(): number {
    return this.indent;
  }
  addLine(...args: any[]) {
    this.beginLine();
    this.add(args);
    this.endLine();
  }
  beginLine() {
    this.s += " ".repeat(this.indent);
  }
  add(...args: any[]) {
    for (const arg of args) {
      this.s += `${arg}`;
    }
  }
  endLine() {
    this.s += "\n";
  }
  toString(): string {
    return this.s;
  }
}
