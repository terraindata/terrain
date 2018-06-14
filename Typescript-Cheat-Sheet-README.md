# Typescript Cheat Sheet

## Overview

A brief summary of Typescrypt most relevant features

## Interfaces

### Readonly Properties: 

```
interface Point {
    readonly x: number;
    readonly y: number;
}
```

### Optional Properties

```
interface SquareConfig {
    color?: string;
    width?: number;
}
```

### Excess Property Checks

```
interface SquareConfig {
    color?: string;
    width?: number;
}

function createSquare(config: SquareConfig): { color: string; area: number } {
    // ...
}
```

Excessive checking when object literal is passed as argument or assigned to typed variable.

```
let yourSquare: SquareConfig = { colour: "red", width: 100 }; // error: 'colour' not expected in type 'SquareConfig'
let mySquare = createSquare({ colour: "red", width: 100 }); // error: 'colour' not expected in type 'SquareConfig'
```

```
let squareOptions = { colour: "red", width: 100 }; // no error since squareOptions has no declared type
let mySquare = createSquare(squareOptions);
```

### Function Types

Checks parameter types in order and return value type. Name of parameters don't need to match

```
interface SearchFunc {
    (source: string, subString: string): boolean;
}

let mySearch: SearchFunc;
mySearch = function(src: string, sub: string): boolean {
    let result = src.search(sub);
    return result > -1;
}
```

### Extending Interfaces

Single inheritance

```
interface Shape {
    color: string;
}

interface Square extends Shape {
    sideLength: number;
}

let square = <Square>{};
square.color = "blue";
square.sideLength = 10;
```

Multiple inheritance

```
interface Shape {
    color: string;
}

interface PenStroke {
    penWidth: number;
}

interface Square extends Shape, PenStroke {
    sideLength: number;
}

let square = <Square>{};
square.color = "blue";
square.sideLength = 10;
square.penWidth = 5.0;
```

## Functions

```
function exampleFunc(oneparam: number, otherparm: string): boolean // <-- return value
```

### Overload

Order from more specific to more generic.

```
function pickCard(x: {suit: string; card: number; }[]): number;
function pickCard(x: number): {suit: string; card: number; };
function pickCard(x): any 
```

### Generics

```
function identity<T>(arg: T): T {
    return arg;
}
```

Type inference

```
identity("mystring") // T is inferred to be string
```

Generic Interface

```
interface GenericIdentityFn<T> {
    (arg: T): T;
}

function identity<T>(arg: T): T {
    return arg;
}

let myIdentity: GenericIdentityFn<number> = identity;
```

Generic Class

```
class GenericNumber<T> {
    zeroValue: T;
    add: (x: T, y: T) => T;
}

let myGenericNumber = new GenericNumber<number>();
myGenericNumber.zeroValue = 0;
myGenericNumber.add = function(x, y) { return x + y; };
```

Generic Constraint

```
interface Lengthwise {
    length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
    console.log(arg.length);  // Now we know it has a .length property, so no more error
    return arg;
}
```

## Type Compatibility

Based on **structural typing**:

```
interface Named {
    name: string;
}

class Person {
    name: string;
}

let p: Named;
// OK, because of structural typing
p = new Person();
```

## Intersection Types

Enforces a value to contain ALL properties from all intersected types to be present.

```
interface Person {
    name: string;
}

interface Identifiable {
    id: number;
}

const person1: Person & Identifiable = { id: 12345, name: 'Jon Doe' }; // is OK
const person2: Person & Identifiable = { name: 'Jon Doe' }; // Error: id is missing.
```

# Union Types

Doesn't enforce the value to have ALL properties, but it cannot have properties that not defined in at least one of the joind types. 

```
let stringOrNumber: string | number;

stringOrNumber = 10; // is OK
stringOrNumber = 'I am a 10'; // is OK
stringOrNumber = true; // Error: true not assignable to string | number

interface Person {
    name: string;
}

interface Identifiable {
    id: number;
}

const person1: Person | Identifiable = { name: 'Jon Doe' }; // Is OK
const person1: Person | Identifiable = { address: '111 Ramona St.', name: 'Jon Doe' }; // Error: address does not exist in type Person | Identifiable
```

## Type Aliases

```
type Name = string;
type NameResolver = () => string;
type NameOrResolver = Name | NameResolver;

type Container<T> = { value: T };
```

## String Literal Types

```
type Easing = "ease-in" | "ease-out" | "ease-in-out";

const easing: string = "ease-in"; // is OK
const typedEasing: Easing = "ease-in"; // is OK
const assignedEasing: Easing = easing; // Beware of this kind of assignments, Error: string is not assignable to type Easing
```

## Polymorphic `this` types

`this`  can be used as return type for fluent interfaces.

```
class BasicCalculator {
    public constructor(protected value: number = 0) { }
    public currentValue(): number {
        return this.value;
    }
    public add(operand: number): this {
        this.value += operand;
        return this;
    }
}

class ScientificCalculator extends BasicCalculator {
    public constructor(value = 0) {
        super(value);
    }
    public sin() {
        this.value = Math.sin(this.value);
        return this;
    }
    // ... other operations go here ...
}

let v = new ScientificCalculator(2)
        .multiply(5)
        .sin()
        .add(1)
        .currentValue();


```

## Indexed Types

```
interface Person {
    name: string;
    age: number;
}
let person: Person = {
    name: 'Jarid',
    age: 35
};
let strings: string[] = pluck(person, ['name']); // ok, string[]

// keyof operator
let personProps: keyof Person; // 'name' | 'age'; 

// T[K] operator, called indexed access operator
function getProperty<T, K extends keyof T>(o: T, name: K): T[K] {
    return o[name]; // o[name] is of type T[K]
}

let name: string = getProperty(person, 'name');
let age: number = getProperty(person, 'age');
let unknown = getProperty(person, 'unknown'); // error, 'unknown' is not in 'name' | 'age'

```

## Mapped types

```
// Turn T into readonly
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
}

// Make all properties optional
type Partial<T> = {
    [P in keyof T]?: T[P];
}
```

## Ambient Modules

someModule.d.ts

```
declare module "url" {
    export interface Url {
        protocol?: string;
        hostname?: string;
        pathname?: string;
    }

    export function parse(urlStr: string, parseQueryString?, slashesDenoteHost?): Url;
}
```

someDependentModule.ts

```
/// <reference path="node.d.ts"/>
import * as URL from "url";
let myUrl = URL.parse("http://www.typescriptlang.org");
Shorthand
```

## Namespaces

```
namespace Validation {
    export interface StringValidator {
        isAcceptable(s: string): boolean;
    }
}

// Validators to use
let validators: { [s: string]: Validation.StringValidator; } = {};
```



