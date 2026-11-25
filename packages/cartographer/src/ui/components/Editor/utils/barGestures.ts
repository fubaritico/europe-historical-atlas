import type { EditorProps } from '../editorProps'

/**
 * The top bar's gestures and the map's name, picked from the editor's props — for the greyed bar of the sign-in screen
 * (CARTO-535), which shows them unavailable.
 * @param props - the editor's props
 * @returns the gestures and the name
 */
export function barGestures(
  props: Omit<EditorProps, 'session'>
): Pick<
  EditorProps,
  | 'onOpen'
  | 'onSave'
  | 'onSaveAs'
  | 'onSaveCopy'
  | 'onCopy'
  | 'onPaste'
  | 'onSelectAll'
  | 'onCopySheet'
  | 'mapName'
> {
  const {
    onOpen,
    onSave,
    onSaveAs,
    onSaveCopy,
    onCopy,
    onPaste,
    onSelectAll,
    onCopySheet,
    mapName,
  } = props
  return {
    onOpen,
    onSave,
    onSaveAs,
    onSaveCopy,
    onCopy,
    onPaste,
    onSelectAll,
    onCopySheet,
    mapName,
  }
}
