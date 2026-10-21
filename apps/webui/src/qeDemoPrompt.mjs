// The pinned MgO QE replay demo only accepts a pristine MgO SCF request. The routing
// dialog's research question must never leak into it: the backend rejects anything that
// does not name MgO and SCF/self-consistency with HTTP 422, so a question typed for
// routing would silently break the demo button (see the 2026-10-20 acceptance round).

export const QE_DEMO_PROMPT =
  'For pristine MgO 2x2x2, generate a QE SCF input and report convergence, total energy, and Fermi energy.';

export function qeDemoPrompt(question) {
  const typed = String(question ?? '').trim();
  const isMgOScf = /mgo/i.test(typed) && /(scf|self[- ]consistency|自洽)/i.test(typed);
  return isMgOScf ? typed : QE_DEMO_PROMPT;
}
