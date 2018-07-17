# Transformation Engines - How do they work?

## Introduction
At its core, a Transformation Engine defines a series of transformations that can be applied to javascript objects. Transformation Engines can rename fields, join fields together, do math, and do all sorts of arbitrary manipulation. Engines also keep track of information that helps keep track of dependencies and relationships between fields.

This documentation provides an technical overview to how Engines work, and the rules and conditions that should be maintained when adding features to the Transformation Engine.

## Fields
Engines maintain a mapping of Ids to Keypaths. Each Id & Keypath pair represents a field in the engine. For example in the document
```
{
  foo: {
    bar: 'hello'
  },
  arr: ['dog', 'cat', 'fish']
}
```
The path `['foo', 'bar']` would guide us 'hello'. This field is unique and there is only at most one in any given document. Paths can also be used to represent fields inside arrays. The path `['arr', -1]` would give us 'dog', but it also is 'cat' and 'fish'. The ID to Keypath mapping that an engine maintains represents where fields should be after all transformations have occurred. For example, in the above document, if we rename 'foo' to be 'baz', then our ID to Path map will change the keypath for ['foo'] to be ['baz'] and will change the keypath for `['foo', 'bar']` to be `['baz', 'bar']`. They are still conceptually represent the same field (and so they have the same ID), but now are at different locations.

The set of all keypaths in a transformation engine implicitly encodes their relationships (e.g. which fields are parents and which ones are children). Objects are naturally tree-like data structures, and so are the relationships between keypaths. We can tell at a glance that `['foo', 'bar']` is the child of `['foo']`, and that `['baz']` may contain many `['baz', -1, 'bar']`.

Keypaths are (almost) always unique. There may be 'nullish' paths, which represent fields that have been deleted from the document by a transformation. This will be explained in more detail later.

## Transformations
Engines store a Directed Graph of Transformations. Transformations are any operation that can change an input object. Transformations can do lots of things! For example: we can rename fields, multiply them, find-replace text, combine fields together, or create entirely new ones. Transformations are nodes in this graph (which we will refer to as the DAG).

Each Transformation has some important properties.

##### fields
The input field ids and keypaths for the transformation. **If a transformation uses a field, it must appear here.**
##### typeCode
The type of transformation that the node represents. This is necessary to differentiate between different transformations when serializing and deserializing the transformation engine.
##### meta
This contains options that act as parameters to the transformation. (e.g. if a Transformation adds a value to a field, we would specify what value to add here). The names and types of the options varies from Transformation to Transformation, but there are some common options that have a shared meaning.
  * newFieldKeyPaths: This is like fields, but specifies the output fields if the transformation creates new fields. In the case of rename transformations, this specifies the new name of the field (This is the only exception to the rule!).
  * fromType: This is specified if the transformation changes the type of the field. This isn't important to the execution or editing of the DAG, but it is important to allow us to look backwards.
  * (todo - will update this list as we add features)

For the most part, transformations are generic and do not need special treatment. All of the logic to handle the different visitors should be handled in the transformation node visitors. There are only a few special nodes that the Transformation Engine itself is aware of, which will be discussed later.

## Types
Types are a pesky side effect of needing to support a UI. They are not actually that important to the execution and editing of the transformation engine. However, knowing what users 'want' is a difficult problem, and knowing what data type each field is supposed to represent is our best weapon against ambiguity.
Because types are not critical to the Transformation Engine, the **Transformation Engine itself should never need to know anything about types**. For this reason, they are stored under each field's field props, and are only accessed or operated on by the visitors whose logic depend on them.
Types do sometimes have a strong influence on adding fields. For example, if a transformation changes a field from an object into a string (aka Stringify), then we know that all the children of that field will no longer exist in the document, and they should be marked as such. Types should only be used to provide helpful information when creating, viewing, and editing the engine. **Types should never be used during the actual transformation process.**

## The DAG
A Transformation Engine's nodes are arranged in a Directed Acyclic Graph. Each node's label is an instance of a TransformationNode and contains the information in the 'Transformations' section above. The edges of this graph are labels that indicate the type of relationship between the nodes.

#### Edges
The following are possible edge labels:
* Synthetic
* Same

**Synthetic edges** `(v, w)` indicate that the transformation `v` structurally affects the fields that transformation `w` operate on. If transformation node w operates on some field `['foo', 'bar']`, the presence of this synthetic edge indicates that without `v`, the field(s) that `w` operates on may not exist, or be at the wrong keypath. Rename transformations produce synthetic edges, as do any transformations that create new fields (e.g. Join and Sum). In short, synthetic edges indicate dependencies between fields.

**Same edges** have some different 'flavors'
* In-Place edges `(v, w)` indicate that `v` and `w` operate the same field. `v` does not structurally affect the field it is operating on. (e.g. Add, Find-Replace, Capitalize)
* Rename edges `(v, w)` indicate that `v` and `w` operate on the same field but the field has been renamed (not necessarily by v!). For this flavor, `w` will always be an identity node of type 'Rename' (more on that below).
* Removal edges `(v, w)` indicate that the field `v` operates on gets removed. Similar to the rename flavor, `w` will always be an identity node of type 'Removal'

#### Special Nodes
There are a few transformation nodes that receive special treatment by the transformation engine.

**Identity Nodes** are no-ops and do not get executed. However they are very important for tracking fields and dependencies between transformations. These Identity nodes always only have 1 input field, which specifies which field it is identifying. All fields in the transformation engine have an identity node. Identity nodes also have a type:
* Organic - These fields exist in the source document. There can only be 1 organic identity node for any given field.
* Synthetic - These fields are created by other transformations. Likewise, there can only be 1 synthetic identity node for any given field, and fields can only be one or the other.
* Rename - These identity nodes are created alongside rename transformations to mark the new location of a field. There can be multiple rename identity nodes for any given field.
* Removal - These indicate where and when fields are removed from a document. There should never be any outbound edges from removal nodes. These can be created by explicit deletion operations, or if a parent field undergoes an operation such as Stringify.

**Rename Nodes** can be simple renames (e.g. `['foo', 'bar']` to `['foo', 'baz']`), but they can also move fields between nested objects. It may seem odd, but there actually no rename edges inbound or outbound from rename nodes. Instead, the rename identity nodes are appended to each affected field (more specifically, their last node), and the rename edges are between these two nodes. Renames can only ever occur between positions with one-to-one relationships. (See 'Vocab' for details)

#### Execution Order
You may notice that Transformation Engines have a stored array called `executionOrder`. This is an array that by default, stores the order in which transformations are appended. This helps determine the order that transformations are executed.
Why do we need it? The DAG isn't fully sufficient to determine the order in which transformations get executed. This is because it only stores enough information to record structural dependencies. Most of the time this is sufficient to determine execution order, but there are some cases where topologically sorting the DAG can leave some ambiguous results.

#### Putting it all together
There are some important invariants and paradigms about the DAG:
* Any particular field should have exactly 1 synthetic or 1 organic identity node.
* Any given node should have at most 1 outbound and 1 inbound non-synthetic edge.
* Combining the above means that any given field has a single path (excluding synthetic edges) from its initial identity transformation to the "end" of the graph
* This path indicates the path that a field takes throughout its lifecycle during the execution of the graph.
* Having a synthetic edge between two nodes `(v, w)` means that without executing `v`, executing `w` may lead to undefined behavior.

> Discuss - should we keep the only 1 non-synthetic edge invariant since it implies that transformations are only ever allowed to create new fields without affecting the base field or mutate the value of one field?

As detailed above, there are dependencies between transformation nodes via the edges and labels, but there are also implicit dependencies between fields based on their keypaths. For example, field `['foo', 'bar']` is dependent on field `['foo']`, so if an operation or edit were to remove the identity node for `['foo']`, we should realize that this affects `['foo', 'bar']` as well.

> Discussion - We could make this dependency explicit in the graph by creating edges that point from the identity node of `['foo']` to that of `['foo', 'bar']`. This edge would be a synthetic. At the moment I have no intuition on if this would make life easier or harder.

