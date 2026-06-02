const { validatePassword, passwordValidationMessage } = require('./src/utils/validators');

console.log('=== Password Policy Validation Test ===\n');

// Test cases
const testCases = [
  { password: '123', expected: false },
  { password: '1234567', expected: false },
  { password: '12345678', expected: true },
  { password: 'abcdefgh', expected: true },
  { password: 'Test@123', expected: true },
  { password: '', expected: false },
  { password: '12345', expected: false },
  { password: 'abcdefijhshdh', expected: true },
];

let passed = 0;
let failed = 0;

testCases.forEach((tc, i) => {
  const result = validatePassword(tc.password);
  const status = result === tc.expected ? 'PASS' : 'FAIL';
  if (result === tc.expected) passed++;
  else failed++;
  console.log(`Test ${i + 1}: "${tc.password}" => ${status} (expected ${tc.expected}, got ${result})`);
});

console.log(`\n---`);
console.log(`Message: "${passwordValidationMessage}"`);
console.log(`\nResult: ${passed}/${passed + failed} tests passed`);
console.log(`Expected policy: min 8 characters`);

if (failed > 0) {
  console.log('\nSome tests FAILED');
  process.exit(1);
} else {
  console.log('\nAll tests PASSED');
  process.exit(0);
}
