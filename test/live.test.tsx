// Type-only checks: with a plugin's live values registered, JSX accepts them for children, attributes and properties.
declare module 'fiorejs/type/base.dom.d.ts' {
  interface LiveValues<T> {
    getter: () => T;
  }
}

const name = () => 'Ada';

void (<span>{name}</span>);
void (<input value={name} placeholder={() => 'Name'} class={() => 'field'} />);
void (<svg viewBox={() => '0 0 10 10'} />);
// @ts-expect-error a getter must still return the right type
void (<input placeholder={() => 42} />);
// @ts-expect-error listeners are not live values
void (<button onclick={'not a function'} />);

export {};
