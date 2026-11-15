// Type checks without any plugin: live getters are not values on their own.

// @ts-expect-error a getter is not an input value without a plugin
void (<input value={() => 'a'} />);
// @ts-expect-error a getter is not a title without a plugin
void (<div title={() => 'x'} />);
void (<input value="a" />);

export {};
