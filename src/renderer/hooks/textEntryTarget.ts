/** Input types that hold no editable text, so they have no text undo of their own. */
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

type KeyTarget = {
  tagName?: string;
  type?: string;
  value?: string;
  isContentEditable?: boolean;
} | null;

/**
 * True when Ctrl/Cmd+Z should go to the browser's own text undo rather than the
 * list undo: focus is in a text field that has text in it.
 *
 * An empty field still gets the list undo. Quick capture keeps focus almost all
 * the time, so without this the shortcut could rarely reach the list at all,
 * and an empty field has nothing of its own worth undoing.
 */
export const hasEditableText = (target: EventTarget | null): boolean => {
  const el = target as KeyTarget;
  if (!el) return false;
  if (el.isContentEditable) return true;

  const tag = el.tagName?.toUpperCase();
  if (tag === 'TEXTAREA') return Boolean(el.value);
  if (tag === 'INPUT') return !NON_TEXT_INPUT_TYPES.has((el.type ?? 'text').toLowerCase()) && Boolean(el.value);
  return false;
};
