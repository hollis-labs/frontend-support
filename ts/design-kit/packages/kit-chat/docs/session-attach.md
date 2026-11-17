# Durable conversation attachment

`createChatSessionBinding` is one view's presentation adapter. Its host-supplied `ChatSessionAdapter` implements admission and replay. The binding retains a bounded render window, the last committed cursor and a draft; it does not own authoritative history, a queue, a runtime or transport. `ChatSessionComposer` stays read-only until the view holds a controller lease, offers **Take control** to viewers and waiting controllers, and displays optional presence. `ChatStream` renders `snapshot.items`, including a gap marker when the host reports a gap. The runnable fixture is `demo/session-attach.tsx`.

## Verified server mapping

[V] Read `hollis-labs/libs@190764babe23ece7b912fa0342a65f22ded4f309:agent/sdk/chathost/host.go`, `agent/sdk/chathost/README.md` and `agent/sdk/session/ports.go`. cs-chat-1 confirmed these API files and signatures are unchanged at reviewed head `bc1013d0655ebef8a4b2c6602467876986f464b7`, merged to libs main as `0728978f25ea377aa9e6724bb595ce394fa8b8c5`. The table maps the merged API. The host must bind every call to the exact active `runtimecontract.Binding` and authenticate the caller independently of request IDs. The frontend interface deliberately does not carry an authorization claim.

| kit-chat call | chathost operation at the named SHA | Mapping |
| --- | --- | --- |
| `binding.attach(role, cursor)` | `Host.Attach(ctx, binding, Viewer/Controller)`, then `Host.ReadEvents(ctx, attachment, afterCursor)` | [V] Chathost `Attach` itself takes no cursor. The binding calls `adapter.attach(role)` and `adapter.readEvents(attachment, cursor)` in order. `''` means before the first committed event. |
| `binding.refresh()` | `Host.ReadEvents(ctx, attachment, afterCursor)` | [V] Replays only the suffix after the committed cursor; `cursor` is a conversation event position, not a PTY byte offset. The view ignores repeated positions. |
| `binding.detach()` | `Host.Detach(ctx, attachment)` | [V] Detach removes that attachment and its writer lease, leaving conversation events and runtime intact. The view retains its cursor, bounded items and draft. |
| `binding.acquire()` | `Host.Acquire(ctx, binding, WriterID(attachment.ID))` | [V] Controller attachment is required; another live writer lease makes acquisition fail. The composer remains read-only while waiting. |
| `binding.requestTakeover()` | Viewer reattaches as `Controller`, then `Host.Takeover(ctx, binding, WriterID(attachment.ID))` if acquire failed | [V] Takeover replaces the writer lease and requires separate `TakeoverControl` permission. A viewer cannot call Takeover using its viewer attachment. If acquire succeeds because no writer remains, takeover is unnecessary. |
| `binding.renewLease()` | `Host.Renew(ctx, lease)` | [V] Optional host adapter method. The host chooses renewal timing; the view stops enabling input at local expiry. A failed renew leaves the draft intact. |
| `binding.submit(text)` | `Host.Submit(ctx, session.Input{Lease, ID, Text})` | [V] The adapter passes the exact lease and a per-binding unique input ID. Chathost checks current generation, attachment, lease and expiry; a rejected late send leaves the draft. |
| `adapter.presence(attachment)` | No chathost presence query at this SHA | [I] Optional host source for currently visible participants. Presence is display only and never grants input. |
| `ChatSessionEvent.kind === 'gap'` | No chathost gap event at this SHA | [I] Optional bounded-replay adapter signal. The binding renders a `ChatMarkerItem` with an error tone; the host must explain and repair missing history. |

`ChatSessionLease.expiresAt` is epoch milliseconds converted from chathost's `time.Time`; `ChatSessionAttachment.id` is chathost's attachment ID. The adapter also retains the exact binding and maps chathost `Event` to a `ChatSessionEvent` carrying a rendered `ChatItem`. The fake fixture models admission and committed positions in memory; it is not a security or transport implementation.

[V] `Host.ValidateLease` is available for a host's synchronous input or resize preflight; `Host.Submit` still checks the lease at the actual commit boundary. `Host.Publish` appends runtime output that later appears in `ReadEvents`. Neither is a separate view operation. A transport that delivers asynchronously must perform its own exact-binding and lease check at delivery. The kit binding never treats a displayed lease or presence as proof of admission.

## View lifecycle

Create one binding per view against the same host adapter. Call `attach('viewer', cursor)` or `attach('controller', cursor)`, render `ChatStream` from `useChatSessionBinding(binding).items`, and render `ChatSessionComposer`. Call `refresh()` when the host reports new committed events. The host calls `detach()` when the view closes. A new view can restore `snapshot.checkpoint` with `createChatSessionBinding(adapter, checkpoint)`; the checkpoint contains only the last cursor, draft and bounded rows currently needed to render. Keep it in host memory if the component will unmount; rendered `ReactNode` items are not a storage format. For durable persistence, store the cursor and draft and reconstruct the render window from the host. The host remains the authority for the full transcript.

The default render window is 500 rows; pass a smaller `maxItems` to the binding factory when the surrounding view uses tighter retention. Dedupe uses committed cursor order. The adapter must return events in ascending committed order and use stable item IDs. On generation change, the host obtains a new exact binding and reattaches; stale leases and attachments are never silently upgraded.

`ChatSessionComposer` disables the text editor for viewers, detached views, expired leases and controller attachments waiting for a lease. It does not clear a draft on failed or fenced input. Use `renderPresence` to replace the default presence line while keeping the same host-provided members.

Lease-changing calls from one view are serialized, and concurrent takeover clicks share one operation. The Take control button is disabled while that operation is pending. A checkpoint restored with a smaller `maxItems` is trimmed immediately, before any attachment or replay.
