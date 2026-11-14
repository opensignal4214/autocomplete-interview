import type { Person } from '../api/people';

export function person(name: string, id = name.toLowerCase().replace(/\W+/g, '-')): Person {
  return {
    id,
    name,
    email: `${id}@example.com`,
    title: 'Engineer',
    department: 'Engineering',
    avatarColor: '#2563eb',
  };
}

/** A promise you can resolve or reject from the outside, to control the order responses arrive in. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
