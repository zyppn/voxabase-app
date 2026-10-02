// A page with unsaved edits (Settings) registers here, so app navigation that
// isn't a plain link (the sidebar's buttons, switching workspace) can ask
// before leaving. Links are handled by the page itself.
let unsaved = false

export function setUnsaved(v: boolean) { unsaved = v }

/** True when it's fine to leave: nothing unsaved, or the person agreed to discard */
export function confirmLeave(): boolean {
  return !unsaved || window.confirm('You have unsaved changes. Leave without saving?')
}
