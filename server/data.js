// Deterministic fake directory of people. Same seed => same data on every machine.
// Contains a few deliberate edge cases (see bottom of file).

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  'Ada', 'Alex', 'Alexandra', 'Amir', 'Ana', 'Andre', 'Anya', 'Ben', 'Bianca', 'Carlos',
  'Chen', 'Chloe', 'Daniel', 'Dana', 'Deepa', 'Diego', 'Elena', 'Eli', 'Emma', 'Fatima',
  'Felix', 'Grace', 'Hana', 'Hiro', 'Ivan', 'Isla', 'Jack', 'Jada', 'James', 'Jin',
  'Kai', 'Kara', 'Kenji', 'Lara', 'Leo', 'Liam', 'Lina', 'Lucas', 'Maya', 'Mei',
  'Mia', 'Mohammed', 'Nadia', 'Noah', 'Nora', 'Omar', 'Olivia', 'Priya', 'Rafael', 'Ravi',
  'Rosa', 'Sam', 'Sara', 'Sofia', 'Tariq', 'Theo', 'Uma', 'Victor', 'Wei', 'Yara', 'Zane',
];

const LAST = [
  'Adams', 'Ahmed', 'Alvarez', 'Anderson', 'Baker', 'Bennett', 'Chen', 'Clark', 'Cohen', 'Davis',
  'Diaz', 'Evans', 'Fischer', 'Garcia', 'Gupta', 'Hall', 'Hernandez', 'Ito', 'Jackson', 'Johnson',
  'Kim', 'Kowalski', 'Lee', 'Lopez', 'Martin', 'Meyer', 'Miller', 'Moore', 'Nakamura', 'Nguyen',
  'Novak', 'Okafor', 'Patel', 'Perez', 'Petrov', 'Quinn', 'Reyes', 'Rossi', 'Sato', 'Schmidt',
  'Shah', 'Silva', 'Singh', 'Smith', 'Tanaka', 'Taylor', 'Thompson', 'Walker', 'Wang', 'Wilson',
  'Wright', 'Young', 'Zhang',
];

const TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager',
  'Product Manager', 'Product Designer', 'Data Scientist', 'Recruiter', 'Account Executive',
  'Customer Success Manager', 'Site Reliability Engineer', 'QA Engineer', 'Technical Writer',
];

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Data', 'Sales', 'Support', 'People', 'Finance'];

const COLORS = ['#e11d48', '#db2777', '#9333ea', '#4f46e5', '#2563eb', '#0891b2', '#059669', '#65a30d', '#d97706', '#ea580c'];

const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

const people = [];
const emailsSeen = new Set();

function add(name, overrides = {}) {
  const id = `u_${String(people.length + 1).padStart(4, '0')}`;
  let email = `${slug(name)}@example.com`;
  let n = 2;
  while (emailsSeen.has(email)) email = `${slug(name)}${n++}@example.com`;
  emailsSeen.add(email);
  people.push({
    id,
    name,
    email,
    title: pick(TITLES),
    department: pick(DEPARTMENTS),
    avatarColor: pick(COLORS),
    ...overrides,
  });
}

for (let i = 0; i < 1000; i++) {
  add(`${pick(FIRST)} ${pick(LAST)}`);
}

// ---- Edge cases (intentional) ----
// Unicode / diacritics
add('José Álvarez');
add('Zoë Kravitz-Brown');
add('Đặng Thị Mai');
add('Søren Kierkegaard');
add('Łukasz Wójcik');
// Punctuation & regex special characters (breaks naive `new RegExp(query)` highlighting)
add("Conor O'Brien");
add('C++ Build Bot (CI)', { title: 'Service Account', department: 'Engineering' });
add('[Deactivated] Pat Morgan', { title: 'Former Employee' });
add('Mary-Kate Olsen');
add('Dr. Strange $pecial*');
// Very long name (layout / truncation)
add('Maximilian Alexander Bartholomew Montgomery-Fitzgerald III');
// Exact duplicates (keys must not be names)
add('Alex Kim', { title: 'Software Engineer', department: 'Engineering' });
add('Alex Kim', { title: 'Software Engineer', department: 'Engineering' });

export default people;
