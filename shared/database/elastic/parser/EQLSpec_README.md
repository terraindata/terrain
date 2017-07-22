### Specification Fields
+ name: a human-readable name for this type
+ desc: a human-readable description of this type
+ url: a url to more documentation about this type
+ def: a valid type definition
+ template: a template for this type clause. null property values mean to recursively use that type's template as well. 

### Valid Type Definitions
(and their additional properties)
+ primitive types: 'string', 'number', 'boolean', 'null', 'any', and 'base' (any non-recursive JSON type)
+ recursive: another type name, meaning that this type inherits properties from another type (like 'string').
  + required: a list of required properties for this type
+ array: a definition string like 'string[]' which indicates an array of strings
+ structural: an object listing valid property names and their value types
+ map: a string of the format '{name:value}' which specifies that the type is an object composed of properties with names of type 'name' and values of type 'value'
+ 'enum': has a set of valid non-recursive values listed in a 'values' property
  + values: a list of valid values for this enum type 
+ 'variant': has a set of valid types based on the JSON type of the clause. This mapping is specified in a 'subtypes' property.
  + subtypes: an object mapping JSON types to type names: `{ string:'field', object:'match_settings'}`



