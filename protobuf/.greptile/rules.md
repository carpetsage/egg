# `protobuf/` — API schema

`ei.proto` mirrors the private Egg, Inc. API. It describes a wire format owned by someone else; it does not define one we control.

## Wire compatibility

- **Renumbering or reusing an existing field number is a breaking change.** Flag it loudly — decoding real save data and API responses depends on these numbers matching the game's.
- Removed fields should be `reserved`, not deleted outright, so the number cannot be silently recycled later.
- Changing a field's type, or its `optional`/`repeated` cardinality, breaks decoding just as thoroughly as renumbering.

Because this schema tracks an external API rather than defining our own, a change here is usually reverse-engineering a change the game made. "This field name is unclear" is rarely useful feedback — the name likely mirrors what the game uses. Focus on wire compatibility instead.
