# Blocks

Blocks are the building blocks of the Builder. Every "Card" in the Builder is a block,
and often a Card may have sub-blocks inside of it, which aren't necessarily visible to the user.

## Types of Blocks

  * Cards: The main type of block. A user can create a Card using the Card deck
  or using the in-Builder suggestions
  
  * Sub-Blocks: Sometimes a complicated Card may need to have smaller blocks
  contained within it. For example, the Transform card contains a list of ScorePoints
  (points that mark an x/y position on the Transform graph). A ScorePoint is a
  sub block.

## Anatomy of a Block

Instances of Blocks are actually instances of Immutable Records.

An Immutable Record is very similar to an ES6 class, but instrumented with
special Immutable properties that help React perform optimizations.

### Block Instance Properties

  * id: Each block is assigned a random id on creation
  * type: Each kind of block has a unique type. This is set by the `initBlocks` method.
  * block-specific properties: When you define a block, you define what
    specific instance properties that block could have. For example,
    "value" if the card has a specific value, "cards" if that card
    contains sub-cards, etc.

### Block Static Properties

When you define a block, you also define its static properties, which apply
to all blocks of that type.

For example, the block's title, colors, code/tql translation, and view display.
To see the available static properties, see Block.tsx and Card.tsx

Right now, you define this as an key/value pair with key "static" and value
as an object of the static properties. In the future, we could change this
to take more advantage of ES6 class properties.


Static properties are not saved to the server.


## Creating a Block

1. Save a new file for your block
  * It's useful to start with a similar block and Save-As
2. Name / rename your block
  * Prepend the name of your block with the language name
3. Define the block's instance properties
  * You get 'type' and 'id' defined for free.
4. Define the block's static properties
  * These are specified in the BlockConfig / CardConfig interfaces
5. Import and add the block to the language's Blocks file
6. If the Block is a Card, add the block's type to the language's
  CardsDeck file.
7. Add the appropriate code to card conversion code in the conversion file

