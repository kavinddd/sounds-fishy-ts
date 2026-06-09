# Feature Specification: Elimination Visual Feedback

**Feature Branch**: `002-elimination-visual-feedback`

**Created**: 2026-05-25

**Updated**: 2026-05-25

**Status**: Draft

**Input**: User description: "A frontend job, add visual feedback wherever someone in the game is eliminated through 'game:eliminated' event that server will broadcast whenever master eliminate any fish. The visual, need to show the role and the hint of the eliminated person, which is already a data/payload of 'game:eliminated' event."

**Revision**: The elimination visual should be a closable dialog that auto-closes within 3 seconds.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - All players see elimination details when a fish is eliminated (Priority: P1)

As a player in an active game, when the master eliminates any fish, I want to see a clear visual notification showing which player was eliminated, their role (red fish or blue fish), and the hint they gave, so I understand the outcome of the elimination decision.

**Why this priority**: This is the core functionality — without this, players have no visual feedback that an elimination occurred and no way to see the eliminated player's role and hint.

**Independent Test**: Can be tested by having the master eliminate any player during the "eliminate" phase and verifying that all players in the room see a centered closable dialog showing the eliminated player's identity, role badge, and hint text, with a visible close button.

**Acceptance Scenarios**:

1. **Given** the game is in the "eliminate" phase, **When** the master eliminates a red fish, **Then** all players see a centered closable dialog with a red-themed background, the eliminated player's name, a "Red Fish" role badge in red, the hint they gave, and a close button
2. **Given** the game is in the "eliminate" phase, **When** the master eliminates a blue fish, **Then** all players see a centered closable dialog with a blue-themed background, the eliminated player's name, a "Blue Fish" role badge in blue, the hint they gave, and a close button
3. **Given** a player has been eliminated, **When** the elimination dialog is displayed, **Then** the eliminated player also receives the same dialog with close button as all other players

---

### User Story 2 - Players can close the dialog or let it auto-dismiss (Priority: P2)

As a player, I want the elimination dialog to be closable manually so I can dismiss it early if I've already seen the information, but also have it auto-dismiss so it doesn't persist if I don't interact with it.

**Why this priority**: Good user experience requires giving players control while ensuring the dialog doesn't block the game flow.

**Independent Test**: Can be tested by observing that after an elimination, the dialog appears with a fade-in animation at center-screen with a visible close button. It auto-dismisses after approximately 3 seconds, or immediately if the player clicks the close button.

**Acceptance Scenarios**:

1. **Given** an elimination has occurred, **When** the dialog is displayed, **Then** it auto-dismisses after approximately 3 seconds without requiring user interaction
2. **Given** the elimination dialog is displayed, **When** the player clicks the close button, **Then** the dialog dismisses immediately
3. **Given** the elimination dialog is displayed, **When** the game state updates (e.g., round transition), **Then** the dialog clears immediately so players see the new state

---

### Edge Cases

- **Multiple consecutive eliminations**: When the master eliminates multiple fish in the same elimination phase (e.g., eliminates a red fish but more remain), each elimination triggers its own dialog. If a new `game:eliminated` event arrives while a dialog is already displayed, the current dialog should be replaced immediately with the new one (showing the latest elimination), not stacked or queued. The auto-dismiss timer resets for the new dialog.
- **Elimination at round end**: If eliminating a fish ends the round (all red eliminated or a blue eliminated), the dialog still auto-dismisses within 3 seconds or immediately when the game state update arrives, to allow the round transition to be visible.
- **Very long hints**: Hints may be full sentences. The dialog must contain hint text within a defined max-height area with internal scrolling if needed, preventing layout overflow.
- **Eliminated player still receives events**: The eliminated player remains in the room and receives the same `game:eliminated` event, displaying the same closable dialog as everyone else.
- **Reconnecting player**: A player who reconnects after an elimination occurred will not have seen the event; this is acceptable — the dialog is ephemeral and tied to the event stream. The rejoining player will see the current game state via `room:sync`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The frontend MUST listen for the `game:eliminated` event and display visual feedback for every occurrence
- **FR-002**: The visual feedback MUST display the eliminated player's role (red fish or blue fish)
- **FR-003**: The visual feedback MUST display the hint that the eliminated player gave
- **FR-004**: The visual feedback MUST display the eliminated player's identity (name or identifier, mapped from the socketId in the event payload)
- **FR-005**: The visual feedback MUST be shown to all players in the room, including the eliminated player
- **FR-006**: The visual feedback MUST auto-dismiss after approximately 3 seconds without requiring user interaction
- **FR-007**: The visual feedback MUST include a visible close button that dismisses the dialog immediately when clicked
- **FR-008**: When multiple fish are eliminated consecutively in the same elimination phase, each new elimination MUST replace the current visual with the new one (the latest elimination is shown) and reset the auto-dismiss timer
- **FR-009**: The visual MUST dismiss immediately when a game state update (`room:sync`) arrives for a new round

#### Visual Design Requirements

- **FR-010**: The visual MUST be a centered closable dialog — a rounded dialog positioned in the center of the screen, above game content, with a semi-transparent backdrop behind it
- **FR-011**: The dialog background MUST be color-coded by role: red-themed (e.g., red tint/accents) for red fish elimination, blue-themed for blue fish elimination, following the existing game role colors
- **FR-012**: The dialog MUST include a role badge showing the eliminated player's role name (e.g., "Red Fish" or "Blue Fish") using the role's associated color
- **FR-013**: The dialog MUST display the eliminated player's name prominently, followed by the hint text in a clearly separate section
- **FR-014**: The dialog MUST include a visible close button, positioned at the top-right or top corner of the dialog
- **FR-015**: The dialog MUST enter with a fade-in animation and exit with a fade-out animation (or similar smooth transition)
- **FR-016**: The dialog content area MUST constrain hint text height with internal scrolling for long hints, preventing the dialog from exceeding a maximum height
- **FR-017**: The dialog MUST work on both desktop (centered in the main content area) and mobile (full-width dialog that fills the screen) layouts

### Key Entities *(include if feature involves data)*

- **Elimination Event Detail**: Contains the eliminated player's socket ID (`socketId`), their role (`role`: "red" or "blue"), and the hint they gave (`hint`). Emitted by the server and received by all clients in the room.
- **Elimination Dialog**: A centered, color-coded closable dialog displayed to all players showing elimination information. Presents player name, role badge (with color), hint text, and a close button in a structured layout. Uses fade-in/fade-out animations. Appears above game content with a semi-transparent backdrop. Can be dismissed manually via the close button or auto-dismisses after approximately 3 seconds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `game:eliminated` events received by a client result in the dialog being displayed
- **SC-002**: All players in a room see identical elimination information (same role, same hint, same player identity) for a given elimination event
- **SC-003**: The dialog auto-dismisses within approximately 3 seconds, or immediately when the close button is clicked, allowing players to see the subsequent game state
- **SC-004**: Players can correctly identify whether a red fish or blue fish was eliminated based solely on the dialog's color theme and role badge, without needing additional game state inspection
- **SC-005**: Players can manually close the dialog by clicking the close button before the auto-dismiss timer expires
- **SC-006**: The dialog does not obstruct game UI elements after dismissal — the underlying game state is fully visible and interactive within 1 second of the dialog dismissing
- **SC-007**: On mobile viewports, the dialog fills the screen and is fully readable, with the hint text scrollable if it exceeds the available height

## Assumptions

- Player names are available in the client's game state and can be mapped from the `socketId` in the event payload to display a meaningful player identity
- The game round may transition immediately after an elimination event is broadcast; the dialog should dismiss promptly so the client can display the updated round state
- The dialog follows the existing design language: rounded corners, appropriate shadows, consistent with the game's sky-blue themed UI
- The frontend event handling follows the existing pattern used for other socket events (e.g., `room:sync`, `room:chat`) in the SocketContext
- Hint text length is variable and may contain full sentences; the dialog handles arbitrary text with constrained height and scrolling
- The elimination event payload includes sufficient data (socketId, role, hint) to populate all fields in the dialog without additional server round-trips
- The semi-transparent backdrop behind the dialog uses a dark, semi-transparent overlay consistent with existing modal patterns in the application
