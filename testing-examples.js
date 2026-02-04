// Enkelt exempel för olika testtyper: unit, integration, regression, idempotence.
// Kör: node testing-examples.js (Du måste ha node installerat)

const tests = [];

function test(name, test) {
  tests.push({ name, test });
}

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function deepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(message || `Deep equal failed:\n${a}\n!==\n${b}`);
  }
}

// ---- Exempel på kod som testas ----

function add(a, b) {
  return a + b;
}

function parseCsv(csv) {
  return csv
    .trim()
    .split("\n")
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function toProductRows(csv) {
  const rows = parseCsv(csv);
  const header = rows[0];
  return rows.slice(1).map((row) => {
    return {
      id: row[header.indexOf("id")],
      name: row[header.indexOf("name")],
      price: Number(row[header.indexOf("price")]),
    };
  });
}

function createFakeDb() {
  const store = new Map();
  return {
    upsert(row) {
      store.set(row.id, row);
    },
    all() {
      return Array.from(store.values());
    },
    count() {
      return store.size;
    },
  };
}

function importProducts(csv, db) {
  const rows = toProductRows(csv);
  rows.forEach((row) => db.upsert(row));
  return rows.length;
}

// ---- Tester ----

// Unit test: ren logik
test("unit: add(2, 2) returns 4", () => {
  equal(add(2, 2), 4, "2 + 2 should be 4");
});

// Integrationstest: logik + beroende (fake DB)
test("integration: import writes rows to db", () => {
  const db = createFakeDb(); // fake dependency
  const csv = "id,name,price\n1,Milk,10\n2,Cheese,20";
  const imported = importProducts(csv, db);
  equal(imported, 2, "Should import 2 rows");
  equal(db.count(), 2, "DB should contain 2 rows");
});

// Regressiontest: samma input => samma output som förväntat
test("regression: golden csv matches expected rows", () => {
  const goldenCsv = "id,name,price\n1,Milk,10\n2,Cheese,20";
  const expected = [
    { id: "1", name: "Milk", price: 10 },
    { id: "2", name: "Cheese", price: 20 },
  ];
  const actual = toProductRows(goldenCsv);
  deepEqual(actual, expected, "Golden output should match expected");
});

// Idempotenstest: en körning av import kan upprepas utan att skapa dubbletter (EXEMPEL)
test("idempotence: import can run twice without duplicates", () => {
  const db = createFakeDb();
  const csv = "id,name,price\n1,Milk,10\n2,Cheese,20";
  importProducts(csv, db);
  const first = db.all();
  importProducts(csv, db);
  const second = db.all();
  equal(db.count(), 2, "Row count should remain 2 after second run");
  deepEqual(second, first, "Data should be unchanged after second run");
});

// ---- Körning ----

let failed = 0;
for (const testInstance of tests) {
  try {
    testInstance.test();
    console.log(`PASS: ${testInstance.name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL: ${testInstance.name}`);
    console.error(err.message);
  }
}

if (failed > 0) {
  process.exit(1);
}
