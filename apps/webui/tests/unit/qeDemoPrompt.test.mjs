import assert from 'node:assert/strict';
import test from 'node:test';
import { QE_DEMO_PROMPT, qeDemoPrompt } from '../../src/qeDemoPrompt.mjs';

test('an empty question falls back to the pinned MgO SCF prompt', () => {
  assert.equal(qeDemoPrompt(''), QE_DEMO_PROMPT);
  assert.equal(qeDemoPrompt('   '), QE_DEMO_PROMPT);
  assert.equal(qeDemoPrompt(undefined), QE_DEMO_PROMPT);
  assert.equal(qeDemoPrompt(null), QE_DEMO_PROMPT);
});

test('a routing question about EIS does not leak into the QE demo', () => {
  const question = '请对这份电化学阻抗谱数据做基本质控：检查高频段虚部符号是否为负、低频段是否发散，并给出质控结论。';
  assert.equal(qeDemoPrompt(question), QE_DEMO_PROMPT);
});

test('a question that mentions MgO but not SCF still falls back to the pinned prompt', () => {
  assert.equal(qeDemoPrompt('Show the MgO band structure'), QE_DEMO_PROMPT);
});

test('an MgO SCF question is passed through', () => {
  const english = 'For pristine MgO 2x2x2, run an SCF calculation and report the total energy.';
  assert.equal(qeDemoPrompt(english), english);
  const chinese = '请对 MgO 做自洽计算，报告收敛情况、总能量和费米能。';
  assert.equal(qeDemoPrompt(chinese), chinese);
  const selfConsistency = 'MgO self-consistency run, please report convergence.';
  assert.equal(qeDemoPrompt(selfConsistency), selfConsistency);
});

test('surrounding whitespace is trimmed', () => {
  const question = '  MgO SCF run  ';
  assert.equal(qeDemoPrompt(question), 'MgO SCF run');
});
