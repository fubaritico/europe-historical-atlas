/** Where [Check this year] stands (CARTO-568). */
export type MapCheckPhase =
  /** Closed. */
  | 'closed'
  /** The CMS is being read. */
  | 'reading'
  /** Read: the groups are shown, worked out from the document and the territories at each render. */
  | 'read'
