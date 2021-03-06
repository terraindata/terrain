# Cards in ElasticSearch

## Autogenerated Spec Cards

Elastic doesn’t have a spec, so we have been parsing the Elastic source code to come up with our own spec for Elastic.

Then, we are automatically generating cards for each “clause” that the spec contains.
 
This lets us automatically have cards to represent any Elastic query — and the cards have advanced behavior, automatically.
 
And if/when ElasticSearch has new releases, we will automatically have cards for any new features.
 
The Elastic spec is contained in `shared/database/elastic/parser/EQLSpec.ts` - that defines all of the specific clause types, and  references different generic clause classes in the `clauses` subdir.
 
We generate cards for that in `src/app/builder/getCard/GetCardVisitor.ts` — this is a visitor pattern that allows us to instrument the spec with the definitions for the cards (we want our `shared` directory to not have any dependencies into our `src` directory, so this is why we break it up that way)
 
In GetCardVisitor, you’ll see functions to visit each generic clause class — taking a clause definition from EQLSpec, return the card definition.
 
There’s a lot going on in there.
 
#### One Example

As an example of how all of this works together, here's a bug we had to fix: 

The cards generated by array clauses were not correctly suggesting new cards / accepting drag-and-dropped cards, so we had to instrument which card types an array clause card accepts.
 
One of the parts of a card definition is which card types it “accepts” — which it can take as children, and where it can take those children (if it has multiple parts).
 
If you look at the Structure card, `visitESStructureClause`, you’ll see it accepts anything that falls into its structure
 
So the bug involves making an `accepts` for `visitESArrayClause`
 
If you look at `ESArrayClause.ts` in the spec definition, you’ll see it takes an `elementID` — I’m guessing this is is the type of clause (clause, not card) that it can take
 
I confirmed that guess by looking at `EQLSpec.ts` and seeing how `ESArrayClause` is used
 
So in `visitESArrayClause` we need to generate an `accepts` list based on that tyupe
 
It’s more complicated that just having an array with a single value because `elementID` could reference a “variant” clause type — a clause that represents a set of different clauses
 
So if you wanted to have an array that could take on strings, numbers, or booleans, you would have to make `elementID` reference a variant type that itself references string, num, bool
 
The way we handle this now is with a private method in GetCardVisitor called `getCardTypes` — you pass it an array of the _clause_ types, and the type of the _clause_ you are currently at (optional), and it returns a list of acceptable _card_ types for that list and specific clause
 
So use that to generate the `accepts` list.


## Custom Cards

Sometimes the spec is not good enough to automatically generate a new UI, so we need to make custom cards for Elastic.

Those are in `src/database/elastic/blocks`
