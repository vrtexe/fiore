// Type checks: a function is never a live value, so a getter is not a value for an attribute or property.

// @ts-expect-error a getter is not an input value
void (<input value={() => 'a'} />);
// @ts-expect-error a getter is not a title
void (<div title={() => 'x'} />);
void (<input value="a" />);

export {};
