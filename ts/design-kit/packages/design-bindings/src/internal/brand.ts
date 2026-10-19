/**
 * The mint mark that makes a host's composition the only source of a resolvable
 * binding.
 *
 * WHY A BRAND AND NOT A CONVENTION. Settled answer #3 of the binding design says a
 * kit may ship default binding rows, as an inert starting table a host composes
 * from — never a shared table with authority. A kit shipping rows is the design
 * layer naming wire kinds, which is the mirror image of the violation CW-0113
 * removed from go-envelopes, so the defence has to hold on a bad day.
 *
 * The first line of that defence is the type split in `binding.ts`: a kit ships a
 * `BindingRequest`, which does not have the host-only fields AT ALL, so it cannot
 * be handed to anything that resolves. This is the second line, for the case the
 * first one does not cover — a kit that constructs the granted shape itself, field
 * by field, and exports it as a table.
 *
 * A `unique symbol` declared here and never exported from the package's entry point
 * cannot be named outside this module, so the branded types cannot be written down
 * by a consumer. `defineBindingTable` is the one function that asserts the brand,
 * and it can only do so after running a host's own decision policy over every row.
 *
 * WHAT THIS IS NOT. It is not a runtime guard and does not pretend to be: the
 * property exists only in the type system and there is nothing at the property key
 * when the program runs. A consumer determined to forge a table can cast to it, and
 * that is fine. The goal is that the accidental path is impossible and the
 * deliberate one is unmistakably deliberate — a cast through `as unknown as` is a
 * thing a reviewer sees. Compare the alternative, where a kit's exported array is
 * assignable to the resolver's parameter and nothing anywhere marks the moment the
 * design layer took authority over wire kinds.
 */
declare const HOST_COMPOSED: unique symbol

/**
 * Carried by the two types only a host's own `defineBindingTable` call produces.
 *
 * Extended rather than intersected so it shows up in editor hovers as part of the
 * type's identity, which is where someone wondering why their literal will not
 * typecheck is most likely to look.
 */
export interface HostComposed {
  /**
   * Type-only. Absent at runtime, by construction — see the module comment.
   */
  readonly [HOST_COMPOSED]: true
}
